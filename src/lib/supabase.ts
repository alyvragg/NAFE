"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  UserRole,
  LocalProfile,
  VerificationStatus,
  SubscriptionTier,
  isValidEmail,
  saveLocalProfile,
  loadLocalProfile,
  clearLocalProfile,
} from "@/components/auth/validators";
import {
  consumeEmailVerification,
  isRenderEmailConfigured,
  requestEmailVerification,
  verifyEmailCode,
} from "@/lib/email";

const DEFAULT_SUPABASE_URL = "https://widycevcjjruphtbkuqp.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_Um8IIgU5HOWDsE-U7W8eog_XJSVavjo";

const ENV_SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SUPABASE_URL =
  ENV_SUPABASE_URL.startsWith("https://") &&
  !ENV_SUPABASE_URL.includes("localhost")
    ? ENV_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;

const ENV_SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();
const SUPABASE_PUBLISHABLE_KEY = ENV_SUPABASE_KEY || DEFAULT_SUPABASE_KEY;

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
  alreadyExists?: boolean;
  isOfflineFallback?: boolean;
}

/**
 * Verifica en Supabase (auth.users + public.profiles) si el correo o WhatsApp ya está registrado.
 */
export async function checkAccountExistsInSupabase(
  contact: string
): Promise<boolean> {
  const clean = contact.trim();
  if (!clean) return false;

  try {
    const { data, error } = await supabase.rpc("check_contact_exists", {
      p_contact: clean,
    });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Solicita el OTP: primero intenta correo real vía Render/Resend si está configurado,
 * y si Render no está disponible (o es WhatsApp), genera el OTP real directo en Supabase (`request_otp_code`).
 */
export async function requestOtpCodeInSupabase(
  contact: string,
  name?: string
): Promise<{
  ok: boolean;
  sentViaEmail?: boolean;
  fallbackCode?: string;
  error?: string;
}> {
  const clean = contact.trim();
  if (!clean) {
    return { ok: false, error: "Ingresa tu WhatsApp o correo." };
  }

  // 1. Si es correo y el backend de correo está activo, enviar por Resend
  if (isValidEmail(clean) && isRenderEmailConfigured()) {
    const emailRes = await requestEmailVerification({ to: clean, name });
    if (emailRes.ok) {
      return { ok: true, sentViaEmail: true };
    }
  }

  // 2. Respaldo directo en Supabase Postgres (`public.request_otp_code`) — funciona 100% en APK Android sin localhost ni Render
  try {
    const { data, error } = await supabase.rpc("request_otp_code", {
      p_contact: clean,
    });
    if (!error && data) {
      return {
        ok: true,
        sentViaEmail: false,
        fallbackCode: String(data),
      };
    }
    return {
      ok: false,
      error: error?.message || "No se pudo generar el código en Supabase.",
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con Supabase para generar el código.",
    };
  }
}

/**
 * Valida el OTP contra el servicio de correo (si está configurado) o directo contra Supabase (`verify_otp_code`).
 */
export async function verifyOtpCodeInSupabase(
  contact: string,
  code: string
): Promise<boolean> {
  const cleanContact = contact.trim();
  const cleanCode = code.trim();
  if (!cleanContact || cleanCode.length !== 5) return false;

  if (isValidEmail(cleanContact) && isRenderEmailConfigured()) {
    const result = await verifyEmailCode({ to: cleanContact, code: cleanCode });
    if (result.ok) return true;
  }

  try {
    const { data, error } = await supabase.rpc("verify_otp_code", {
      p_contact: cleanContact,
      p_code: cleanCode,
    });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
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
    isVerified: false,
    verificationStatus: "unverified",
    subscriptionTier: "free",
    searchRadiusKm: 10,
    authenticatedAt: new Date().toISOString(),
  };

  try {
    // 1. Verificar explícitamente si la cuenta ya existe
    const exists = await checkAccountExistsInSupabase(cleanContact);
    if (exists) {
      return {
        ok: false,
        alreadyExists: true,
        error: "Esta cuenta ya fue creada. Inicia sesión con tu contraseña.",
      };
    }

    // Consumir verificación en Render si está configurado (no bloquea si se verificó vía Supabase RPC)
    if (isValidEmail(cleanContact) && isRenderEmailConfigured()) {
      void consumeEmailVerification(cleanContact);
    }

    // 2. Crear cuenta real en Supabase Auth
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
      const lower = error.message.toLowerCase();
      if (
        lower.includes("already registered") ||
        lower.includes("already exists") ||
        lower.includes("user already")
      ) {
        return {
          ok: false,
          alreadyExists: true,
          error: "Esta cuenta ya fue creada. Inicia sesión con tu contraseña.",
        };
      }
      return { ok: false, error: translateSupabaseError(error.message) };
    }

    // Supabase devuelve identities vacío cuando el usuario ya existe y confirm email está activo
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        ok: false,
        alreadyExists: true,
        error: "Esta cuenta ya fue creada. Inicia sesión con tu contraseña.",
      };
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
    return {
      ok: false,
      error: "No se pudo conectar con Supabase. Intenta de nuevo.",
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
        "full_name, avatar_url, contact, phone_whatsapp, role, stall_name, producer_bio, default_meeting_point, is_verified, verification_status, subscription_tier, search_radius_km"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    const meta = data.user.user_metadata || {};
    const resolvedRole = normalizeRoleFromDb(profileRow?.role ?? meta.role);

    const resolvedProfile: LocalProfile = {
      userId: data.user.id,
      name: profileRow?.full_name || meta.full_name || capitalizedFallback,
      avatarUrl: profileRow?.avatar_url || undefined,
      contact:
        profileRow?.phone_whatsapp ||
        profileRow?.contact ||
        meta.contact ||
        cleanIdentifier,
      role: resolvedRole,
      stallName: profileRow?.stall_name || undefined,
      producerBio: profileRow?.producer_bio || undefined,
      defaultMeetingPoint: profileRow?.default_meeting_point || undefined,
      isVerified: Boolean(profileRow?.is_verified),
      verificationStatus:
        (profileRow?.verification_status as VerificationStatus) || "unverified",
      subscriptionTier:
        (profileRow?.subscription_tier as SubscriptionTier) || "free",
      searchRadiusKm: Number(profileRow?.search_radius_km) || 10,
      authenticatedAt: new Date().toISOString(),
    };

    saveLocalProfile(resolvedProfile);
    return { ok: true, profile: resolvedProfile };
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con Supabase. Verifica tu conexión.",
    };
  }
}

export async function updateProfileInSupabase(
  patch: Partial<
    Pick<
      LocalProfile,
      | "name"
      | "avatarUrl"
      | "contact"
      | "role"
      | "stallName"
      | "producerBio"
      | "defaultMeetingPoint"
      | "isVerified"
      | "verificationStatus"
      | "subscriptionTier"
      | "searchRadiusKm"
    >
  >
): Promise<LocalProfile> {
  const current = loadLocalProfile() ?? {
    name: "Alex",
    contact: "",
    role: "both" as UserRole,
    isVerified: false,
    verificationStatus: "unverified" as VerificationStatus,
    subscriptionTier: "free" as SubscriptionTier,
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
          avatar_url: updated.avatarUrl ?? null,
          contact: updated.contact,
          phone_whatsapp: updated.contact,
          role: updated.role,
          stall_name: updated.stallName ?? null,
          producer_bio: updated.producerBio ?? null,
          default_meeting_point: updated.defaultMeetingPoint ?? null,
          is_verified: Boolean(updated.isVerified),
          verification_status: updated.verificationStatus ?? "unverified",
          subscription_tier: updated.subscriptionTier ?? "free",
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

export async function requestSellerVerification(params: {
  stallName: string;
  craftDescription: string;
  publicPoint: string;
}): Promise<LocalProfile> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("verification_requests").insert({
          user_id: user.id,
          stall_name: params.stallName,
          craft_description: params.craftDescription,
          public_point: params.publicPoint,
          status: "approved",
        });
      }
    } catch {
      // Ignore offline
    }
  }

  return updateProfileInSupabase({
    stallName: params.stallName,
    producerBio: params.craftDescription,
    defaultMeetingPoint: params.publicPoint,
    isVerified: true,
    verificationStatus: "verified",
  });
}

export async function upgradeSubscriptionTier(
  tier: SubscriptionTier
): Promise<LocalProfile> {
  return updateProfileInSupabase({
    subscriptionTier: tier,
  });
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
    return "Correo/WhatsApp o contraseña incorrectos. Verifica tus datos o regístrate.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu cuenta está pendiente de confirmación.";
  }
  if (lower.includes("password should be at least")) {
    return "Tu contraseña debe tener al menos 6 caracteres.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera unos segundos e inténtalo de nuevo.";
  }
  return `No pudimos autenticar tu cuenta (${raw}).`;
}
