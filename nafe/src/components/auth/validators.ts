export type UserRole = "buyer" | "seller" | "both";

export interface LocalProfile {
  userId?: string;
  name: string;
  contact: string;
  role: UserRole;
  stallName?: string;
  producerBio?: string;
  defaultMeetingPoint?: string;
  searchRadiusKm?: number;
  authenticatedAt: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidWhatsApp(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.length >= 12 && digits.length <= 13);
}

export function validateContact(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Por favor ingresa tu número de WhatsApp o correo electrónico.";
  }
  if (!isValidEmail(trimmed) && !isValidWhatsApp(trimmed)) {
    return "Ingresa un correo válido o un WhatsApp de 10 dígitos (ej. 618 123 4567).";
  }
  return null;
}

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Cuéntanos cómo te llamas para poder saludarte.";
  }
  if (trimmed.length < 2) {
    return "Tu nombre debe tener al menos 2 letras.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return "Por favor escribe tu contraseña.";
  }
  if (value.length < 6) {
    return "Tu contraseña debe tener al menos 6 caracteres.";
  }
  return null;
}

export function formatContactDisplay(value: string): string {
  const trimmed = value.trim();
  if (isValidEmail(trimmed)) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return trimmed;
}

export const STORAGE_KEY = "nafe_local_profile_v1";
export const PROFILE_CHANGE_EVENT = "nafe-local-profile-change";

export function saveLocalProfile(profile: LocalProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
  } catch {
    // Ignore storage quota errors in restricted WebViews
  }
}

export function loadLocalProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export function clearLocalProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
  } catch {
    // Ignore
  }
}
