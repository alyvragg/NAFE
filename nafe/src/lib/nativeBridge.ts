"use client";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface NativeLocationResult {
  coords: GeoCoordinates;
  cityLabel: string;
  source: "tauri-gps" | "browser-gps" | "ip-network" | "fallback";
  isFallback: boolean;
  accuracyMeters?: number;
}

// Fallback controlado (Durango, Dgo.)
export const DEFAULT_CENTER_COORDS: GeoCoordinates = {
  lat: 24.0277,
  lng: -104.6532,
};

const EARTH_RADIUS_KM = 6371.0;
const GEOCODE_CACHE_KEY = "nafe_osm_geocode_cache_v1";
const LAST_LOCATION_KEY = "nafe_last_known_location_v1";
const OFFLINE_PRODUCERS_KEY = "nafe_offline_producers_cache_v3";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Fórmula exacta de Haversine (idéntica a src-tauri/src/lib.rs).
 * Redondea a 1 decimal en kilómetros.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) *
      Math.cos(rLat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
}

/**
 * Aplica privacidad física (~300–500 m aleatorios) a coordenadas reales
 * antes de guardar approx_lat / approx_lng de un productor en Supabase.
 */
export function applyPrivacyFuzzing(coords: GeoCoordinates): GeoCoordinates {
  // 0.003 a 0.0045 grados equivale aproximadamente a 330–500 metros
  const angle = Math.random() * Math.PI * 2;
  const radiusDeg = 0.0028 + Math.random() * 0.0017;
  const approxLat = Number((coords.lat + Math.cos(angle) * radiusDeg).toFixed(6));
  const approxLng = Number((coords.lng + Math.sin(angle) * radiusDeg).toFixed(6));
  return { lat: approxLat, lng: approxLng };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3800
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

function readGeocodeCache(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, string>;
    return cache[key] ?? null;
  } catch {
    return null;
  }
}

function writeGeocodeCache(key: string, label: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(GEOCODE_CACHE_KEY);
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
    cache[key] = label;
    window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLastKnownLocation(): NativeLocationResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NativeLocationResult;
    if (
      parsed?.coords &&
      typeof parsed.coords.lat === "number" &&
      typeof parsed.coords.lng === "number" &&
      parsed.cityLabel
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveLastKnownLocation(loc: NativeLocationResult): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
  } catch {
    // Ignore
  }
}

/**
 * Geocodificación inversa con OpenStreetMap Nominatim + caché local + respaldo BigDataCloud
 * para garantizar que el nombre real de colonia y ciudad siempre cargue rápido.
 */
export async function reverseGeocodeOSM(
  lat: number,
  lng: number
): Promise<string> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = readGeocodeCache(cacheKey);
  if (cached) return cached;

  // 1. Intento principal: OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;

    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "Accept-Language": "es-MX,es;q=0.9",
        },
      },
      3800
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      const neighborhood =
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
        neighborhood && city && neighborhood !== city
          ? `${neighborhood}, ${city}`
          : city || neighborhood;

      if (label) {
        writeGeocodeCache(cacheKey, label);
        return label;
      }
    }
  } catch {
    // Continuar al respaldo sin bloquear
  }

  // 2. Respaldo rápido CORS-friendly (BigDataCloud Reverse Geocode Client)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lng)}&localityLanguage=es`;
    const res = await fetchWithTimeout(bdcUrl, {}, 3200);
    if (res.ok) {
      const data = await res.json();
      const locality = data?.locality || "";
      const city = data?.city || data?.principalSubdivision || "";
      const label =
        locality && city && locality !== city
          ? `${locality}, ${city}`
          : city || locality;

      if (label) {
        writeGeocodeCache(cacheKey, label);
        return label;
      }
    }
  } catch {
    // Ignorar
  }

  return "Centro, Durango";
}

async function resolveBrowserGps(): Promise<{
  coords: GeoCoordinates;
  accuracyMeters?: number;
} | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;
    const hardTimeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 4800);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy,
        });
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 4200,
        maximumAge: 180000,
      }
    );
  });
}

async function resolveIpGeolocation(): Promise<NativeLocationResult | null> {
  try {
    const res = await fetchWithTimeout(
      "https://get.geojs.io/v1/ip/geo.json",
      {},
      3200
    );
    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data?.latitude);
    const lng = Number(data?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const city = data?.city || data?.region || "";
    const region = data?.region || "";
    const fallbackLabel =
      city && region && city !== region ? `${city}, ${region}` : city || "Tu zona";

    const refinedLabel = await reverseGeocodeOSM(lat, lng).catch(
      () => fallbackLabel
    );

    return {
      coords: { lat, lng },
      cityLabel: refinedLabel || fallbackLabel,
      source: "ip-network",
      isFallback: false,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene la ubicación real del usuario de forma rápida y confiable:
 * 1) En Android Tauri v2: solicita permiso GPS nativo vía @tauri-apps/plugin-geolocation.
 * 2) En navegador Web: intenta navigator.geolocation.getCurrentPosition (rápido).
 * 3) Si el GPS del navegador falla/se bloquea (ej. escritorio o LAN HTTP): usa geolocalización de red IP.
 * 4) Si está sin señal: devuelve la última ubicación guardada o Durango (isFallback: true).
 */
export async function getCurrentLocation(): Promise<NativeLocationResult> {
  // 1. Tauri v2 Native GPS (Android APK)
  if (isTauriRuntime()) {
    try {
      const geoPlugin = await import("@tauri-apps/plugin-geolocation");
      let perms = await geoPlugin.checkPermissions();
      if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
        perms = await geoPlugin.requestPermissions(["location"]);
      }

      if (perms.location === "granted" || perms.coarseLocation === "granted") {
        const pos = await geoPlugin.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60000,
        });
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const cityLabel = await reverseGeocodeOSM(coords.lat, coords.lng);
        const result: NativeLocationResult = {
          coords,
          cityLabel,
          source: "tauri-gps",
          isFallback: false,
          accuracyMeters: pos.coords.accuracy,
        };
        saveLastKnownLocation(result);
        return result;
      }
    } catch {
      // Continuar a fallback web/IP
    }
  }

  // 2. Web Geolocation API
  const browserGps = await resolveBrowserGps();
  if (browserGps) {
    const cityLabel = await reverseGeocodeOSM(
      browserGps.coords.lat,
      browserGps.coords.lng
    );
    const result: NativeLocationResult = {
      coords: browserGps.coords,
      cityLabel,
      source: "browser-gps",
      isFallback: false,
      accuracyMeters: browserGps.accuracyMeters,
    };
    saveLastKnownLocation(result);
    return result;
  }

  // 3. IP Network Geolocation Fallback (para PC sin GPS o desarrollo LAN HTTP)
  if (typeof navigator === "undefined" || navigator.onLine) {
    const ipLoc = await resolveIpGeolocation();
    if (ipLoc) {
      saveLastKnownLocation(ipLoc);
      return ipLoc;
    }
  }

  // 4. Última ubicación guardada o fallback controlado (Durango)
  const saved = loadLastKnownLocation();
  if (saved) {
    return { ...saved, isFallback: true };
  }

  return {
    coords: DEFAULT_CENTER_COORDS,
    cityLabel: "Centro, Durango",
    source: "fallback",
    isFallback: true,
  };
}

/**
 * Invoca el comando nativo en Rust `filter_and_sort_by_distance` en Tauri v2,
 * o usa Haversine en TypeScript en navegador PC.
 */
export async function sortProducersByDistance<
  T extends { approxLat: number; approxLng: number; distanceKm: number },
>(
  userLat: number,
  userLng: number,
  maxRadiusKm: number,
  producers: T[]
): Promise<T[]> {
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const payload = producers.map((p) => ({
        ...p,
        approx_lat: p.approxLat,
        approx_lng: p.approxLng,
      }));

      const rawJson = await invoke<string>("filter_and_sort_by_distance", {
        userLat,
        userLng,
        maxRadiusKm,
        producersJson: JSON.stringify(payload),
      });

      const parsed = JSON.parse(rawJson) as Array<T & { distance_km?: number }>;
      return parsed.map((item) => ({
        ...item,
        distanceKm:
          typeof item.distance_km === "number"
            ? item.distance_km
            : haversineDistanceKm(userLat, userLng, item.approxLat, item.approxLng),
      }));
    } catch {
      // Fallback silencioso a Haversine TS
    }
  }

  return producers
    .map((item) => ({
      ...item,
      distanceKm: haversineDistanceKm(
        userLat,
        userLng,
        item.approxLat,
        item.approxLng
      ),
    }))
    .filter((item) => maxRadiusKm <= 0 || item.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Guarda productores en caché nativo de Rust (`save_offline_cache`) + localStorage.
 */
export async function saveOfflineProducers<T>(items: T[]): Promise<void> {
  const payload = JSON.stringify(items);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(OFFLINE_PRODUCERS_KEY, payload);
    } catch {
      // Ignore
    }
  }

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_offline_cache", { payloadJson: payload });
    } catch {
      // Ignore
    }
  }
}

/**
 * Lee productores desde caché nativo de Rust (`load_offline_cache`) o localStorage.
 */
export async function loadOfflineProducers<T>(): Promise<T[] | null> {
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw = await invoke<string>("load_offline_cache");
      const parsed = JSON.parse(raw) as T[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback a localStorage
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(OFFLINE_PRODUCERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as T[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Abre URLs externas (WhatsApp wa.me) usando @tauri-apps/plugin-opener en Android APK
 * o window.open en navegador Web.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      // Fallback
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
