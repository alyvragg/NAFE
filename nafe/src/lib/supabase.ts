"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  UserRole,
  LocalProfile,
  isValidEmail,
  saveLocalProfile,
  loadLocalProfile,
  clearLocalProfile,
} from "@/components/auth/validators";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://widycevcjjruphtbkuqp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_Um8IIgU5HOWDsE-U7W8eog_XJSVavjo";

const globalForSupabase = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __nafeSupabaseClient?: SupabaseClient<any, "public", any>;
};

export const supabase =
  globalForSupabase.__nafeSupabaseClient ??
  (globalForSupabase.__nafeSupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "nafe_supabase_auth_v1",
      },
    }
  ));

export function contactToAuthEmail(contact: string): string {
  const trimmed = contact.trim();
  if (isValidEmail(trimmed)) {
    return trimmed.toLowerCase();
  }
  const digits = trimmed.replace(/\D/g, "");
  const normalized10 = digits.length > 10 ? digits.slice(-10) : digits;
  return `wa.${normalized10}@nafe.mx`;
}

export function normalizeRoleFromDb(raw: unknown): UserRole {
  if (raw === "buyer" || raw === "comprar") return "buyer";
  if (raw === "seller" || raw === "vender") return "seller";
  return "both";
}

export interface AuthResult {
  ok: boolean;
  profile?: LocalProfile;
  error?: string;
  isOfflineFallback?: boolean;
}

export async function signUpWithSupabase(params: {
  name: string;
  contact: string;
  password: string;
  role: UserRole;
}): Promise<AuthResult> {
  const cleanName = params.name.trim();
  const cleanContact = params.contact.trim();
  const authEmail = contactToAuthEmail(cleanContact);

  const localProfile: LocalProfile = {
    name: cleanName,
    contact: cleanContact,
    role: params.role,
    searchRadiusKm: 10,
    authenticatedAt: new Date().toISOString(),
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    saveLocalProfile(localProfile);
    return {
      ok: true,
      profile: localProfile,
      isOfflineFallback: true,
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanName,
          contact: cleanContact,
          phone_whatsapp: cleanContact,
          role: params.role,
        },
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        const signInRes = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: params.password,
        });

        if (signInRes.error) {
          return {
            ok: false,
            error:
              "Este WhatsApp o correo ya está registrado. Intenta iniciar sesión con tu contraseña.",
          };
        }

        if (signInRes.data.user) {
          await supabase.from("profiles").upsert(
            {
              id: signInRes.data.user.id,
              full_name: cleanName,
              contact: cleanContact,
              phone_whatsapp: cleanContact,
              role: params.role,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }

        const existingProf = {
          ...localProfile,
          userId: signInRes.data.user?.id,
        };
        saveLocalProfile(existingProf);
        return { ok: true, profile: existingProf };
      }

      return { ok: false, error: translateSupabaseError(error.message) };
    }

    let activeUser = data.user;
    if (!data.session && data.user) {
      const signInAttempt = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: params.password,
      });
      if (signInAttempt.data.user) {
        activeUser = signInAttempt.data.user;
      }
    }

    if (activeUser) {
      await supabase.from("profiles").upsert(
        {
          id: activeUser.id,
          full_name: cleanName,
          contact: cleanContact,
          phone_whatsapp: cleanContact,
          role: params.role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    const finalProfile: LocalProfile = {
      ...localProfile,
      userId: activeUser?.id,
    };
    saveLocalProfile(finalProfile);

    return { ok: true, profile: finalProfile };
  } catch {
    saveLocalProfile(localProfile);
    return {
      ok: true,
      profile: localProfile,
      isOfflineFallback: true,
    };
  }
}

export async function signInWithSupabase(params: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  const cleanIdentifier = params.identifier.trim();
  const authEmail = contactToAuthEmail(cleanIdentifier);

  const fallbackDerivedName = cleanIdentifier.includes("@")
    ? cleanIdentifier.split("@")[0].replace(/[._-]+/g, " ")
    : "Vecino";
  const capitalizedFallback =
    fallbackDerivedName.charAt(0).toUpperCase() + fallbackDerivedName.slice(1);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const existing = loadLocalProfile();
    const offlineProfile: LocalProfile = existing ?? {
      name: capitalizedFallback,
      contact: cleanIdentifier,
      role: "both",
      searchRadiusKm: 10,
      authenticatedAt: new Date().toISOString(),
    };
    saveLocalProfile(offlineProfile);
    return {
      ok: true,
      profile: offlineProfile,
      isOfflineFallback: true,
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: params.password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        error: translateSupabaseError(
          error?.message || "Credenciales inválidas"
        ),
      };
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select(
        "full_name, contact, phone_whatsapp, role, stall_name, producer_bio, default_meeting_point, search_radius_km"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    const meta = data.user.user_metadata || {};
    const resolvedRole = normalizeRoleFromDb(profileRow?.role ?? meta.role);

    const resolvedProfile: LocalProfile = {
      userId: data.user.id,
      name: profileRow?.full_name || meta.full_name || capitalizedFallback,
      contact:
        profileRow?.phone_whatsapp ||
        profileRow?.contact ||
        meta.contact ||
        cleanIdentifier,
      role: resolvedRole,
      stallName: profileRow?.stall_name || undefined,
      producerBio: profileRow?.producer_bio || undefined,
      defaultMeetingPoint: profileRow?.default_meeting_point || undefined,
      searchRadiusKm: Number(profileRow?.search_radius_km) || 10,
      authenticatedAt: new Date().toISOString(),
    };

    saveLocalProfile(resolvedProfile);
    return { ok: true, profile: resolvedProfile };
  } catch {
    const offlineProfile: LocalProfile = {
      name: capitalizedFallback,
      contact: cleanIdentifier,
      role: "both",
      searchRadiusKm: 10,
      authenticatedAt: new Date().toISOString(),
    };
    saveLocalProfile(offlineProfile);
    return {
      ok: true,
      profile: offlineProfile,
      isOfflineFallback: true,
    };
  }
}

export async function updateProfileInSupabase(
  patch: Partial<
    Pick<
      LocalProfile,
      | "name"
      | "contact"
      | "role"
      | "stallName"
      | "producerBio"
      | "defaultMeetingPoint"
      | "searchRadiusKm"
    >
  >
): Promise<LocalProfile> {
  const current = loadLocalProfile() ?? {
    name: "Alex",
    contact: "",
    role: "both" as UserRole,
    searchRadiusKm: 10,
    authenticatedAt: new Date().toISOString(),
  };

  const updated: LocalProfile = {
    ...current,
    ...patch,
  };
  saveLocalProfile(updated);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return updated;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          full_name: updated.name,
          contact: updated.contact,
          phone_whatsapp: updated.contact,
          role: updated.role,
          stall_name: updated.stallName ?? null,
          producer_bio: updated.producerBio ?? null,
          default_meeting_point: updated.defaultMeetingPoint ?? null,
          search_radius_km: updated.searchRadiusKm ?? 10,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  } catch {
    // Ignore when offline
  }

  return updated;
}

export async function updateRoleInSupabase(nextRole: UserRole): Promise<void> {
  await updateProfileInSupabase({ role: nextRole });
}

export async function signOutFromSupabase(): Promise<void> {
  clearLocalProfile();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore offline errors
  }
}

function translateSupabaseError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "No encontramos una cuenta con ese WhatsApp/correo o la contraseña no coincide. Verifica tus datos o regístrate.";
  }
  if (lower.includes("password should be at least")) {
    return "Tu contraseña debe tener al menos 6 caracteres.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera unos segundos e inténtalo de nuevo.";
  }
  return `No pudimos autenticar tu cuenta (${raw}).`;
}
