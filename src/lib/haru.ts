"use client";

import { supabase } from "./supabase";

export interface HaruLocation {
  lat: number;
  lng: number;
  cityLabel: string;
  accuracy?: number;
  source: "tauri-gps" | "web-gps" | "cached";
}

export const DEFAULT_HARU_COORDS = {
  lat: 24.0277,
  lng: -104.6532,
};

const HARU_STORAGE_KEY = "nafe_haru_location_v1";
const HARU_NOMINATIM_CACHE_KEY = "nafe_haru_nominatim_cache_v1";

export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Redondea y desplaza (~300m aleatorios) las coordenadas reales para proteger
 * la privacidad física del productor al publicar su negocio.
 */
export function fuzzCoordinates(
  lat: number,
  lng: number
): { lat: number; lng: number } {
  const angle = Math.random() * Math.PI * 2;
  const radiusDeg = 0.0027 + Math.random() * 0.0014; // ~300–450 metros
  return {
    lat: Number((lat + Math.cos(angle) * radiusDeg).toFixed(6)),
    lng: Number((lng + Math.sin(angle) * radiusDeg).toFixed(6)),
  };
}

function readCachedHaru(): HaruLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HARU_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HaruLocation;
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number" &&
      parsed.cityLabel
    ) {
      return { ...parsed, source: "cached" };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedHaru(loc: HaruLocation): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HARU_STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // Ignore
  }
}

function readNominatimCache(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HARU_NOMINATIM_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[key] ?? null;
  } catch {
    return null;
  }
}

function writeNominatimCache(key: string, label: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(HARU_NOMINATIM_CACHE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[key] = label;
    window.localStorage.setItem(HARU_NOMINATIM_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

async function fetchTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4500
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

/**
 * Consulta OpenStreetMap Nominatim (`Accept-Language: es`) para obtener
 * la colonia o municipio real a partir de lat/lng.
 */
export async function resolveCityFromNominatim(
  lat: number,
  lng: number
): Promise<string> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = readNominatimCache(key);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;

    const res = await fetchTimeout(
      url,
      {
        headers: {
          "Accept-Language": "es",
        },
      },
      4500
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      const suburb =
        addr.suburb ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.residential ||
        addr.village ||
        "";
      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.county ||
        addr.state ||
        "";

      const label =
        suburb && city && suburb !== city
          ? `${suburb}, ${city}`
          : city || suburb;

      if (label) {
        writeNominatimCache(key, label);
        return label;
      }
    }
  } catch {
    // Continuar al respaldo
  }

  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lng)}&localityLanguage=es`;
    const res = await fetchTimeout(bdcUrl, {}, 3500);
    if (res.ok) {
      const data = await res.json();
      const locality = data?.locality || "";
      const city = data?.city || data?.principalSubdivision || "";
      const label =
        locality && city && locality !== city
          ? `${locality}, ${city}`
          : city || locality;
      if (label) {
        writeNominatimCache(key, label);
        return label;
      }
    }
  } catch {
    // Ignorar
  }

  return "Centro, Durango";
}

async function syncHaruToSupabaseProfile(loc: HaruLocation): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          last_lat: loc.lat,
          last_lng: loc.lng,
          city_label: loc.cityLabel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  } catch {
    // Ignorar si no hay conexión
  }
}

/**
 * Función obligatoria `haru`:
 * Obtiene la ubicación real del usuario en Android Tauri o Web/PC,
 * resuelve el nombre real de colonia/municipio vía OpenStreetMap Nominatim,
 * guarda caché local y sincroniza `profiles.last_lat`, `last_lng` y `city_label` en Supabase.
 */
export async function haru(options?: {
  forceRefresh?: boolean;
}): Promise<HaruLocation> {
  if (!options?.forceRefresh) {
    const existing = readCachedHaru();
    if (existing) {
      return existing;
    }
  }

  // 1. Android Tauri v2 (`@tauri-apps/plugin-geolocation`)
  if (isTauriEnvironment()) {
    try {
      const geoPlugin = await import("@tauri-apps/plugin-geolocation");
      let perms = await geoPlugin.checkPermissions();
      if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
        perms = await geoPlugin.requestPermissions(["location"]);
      }

      if (perms.location === "granted" || perms.coarseLocation === "granted") {
        const pos = await geoPlugin.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        });

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const cityLabel = await resolveCityFromNominatim(lat, lng);

        const result: HaruLocation = {
          lat,
          lng,
          cityLabel,
          accuracy: pos.coords.accuracy,
          source: "tauri-gps",
        };
        writeCachedHaru(result);
        void syncHaruToSupabaseProfile(result);
        return result;
      }
    } catch {
      // Continuar a Web GPS
    }
  }

  // 2. Web / PC Geolocation (`navigator.geolocation.getCurrentPosition`)
  if (typeof window !== "undefined" && "geolocation" in navigator) {
    const webPos = await new Promise<GeolocationPosition | null>((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 6000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(pos);
        },
        () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
    });

    if (webPos) {
      const lat = webPos.coords.latitude;
      const lng = webPos.coords.longitude;
      const cityLabel = await resolveCityFromNominatim(lat, lng);

      const result: HaruLocation = {
        lat,
        lng,
        cityLabel,
        accuracy: webPos.coords.accuracy,
        source: "web-gps",
      };
      writeCachedHaru(result);
      void syncHaruToSupabaseProfile(result);
      return result;
    }
  }

  // 3. Respaldo de red IP cuando el navegador de escritorio no tiene sensor GPS
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const res = await fetchTimeout("https://get.geojs.io/v1/ip/geo.json", {}, 3500);
      if (res.ok) {
        const data = await res.json();
        const lat = Number(data?.latitude);
        const lng = Number(data?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const cityLabel = await resolveCityFromNominatim(lat, lng);
          const result: HaruLocation = {
            lat,
            lng,
            cityLabel,
            source: "web-gps",
          };
          writeCachedHaru(result);
          void syncHaruToSupabaseProfile(result);
          return result;
        }
      }
    } catch {
      // Continuar a caché
    }
  }

  // 4. Caché local previo o coordenadas base de Durango
  const cached = readCachedHaru();
  if (cached) return cached;

  const fallback: HaruLocation = {
    lat: DEFAULT_HARU_COORDS.lat,
    lng: DEFAULT_HARU_COORDS.lng,
    cityLabel: "Centro, Durango",
    source: "cached",
  };
  writeCachedHaru(fallback);
  return fallback;
}
