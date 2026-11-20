"use client";

import {
  haru,
  fuzzCoordinates,
  isTauriEnvironment,
  DEFAULT_HARU_COORDS,
  HaruLocation,
} from "./haru";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export const DEFAULT_CENTER_COORDS: GeoCoordinates = DEFAULT_HARU_COORDS;
export { haru, fuzzCoordinates, isTauriEnvironment };
export type { HaruLocation };

const EARTH_RADIUS_KM = 6371.0;
const OFFLINE_BUSINESSES_KEY = "nafe_offline_businesses_cache_v1";

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

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
 * Invoca el comando nativo en Rust `filter_and_sort_by_distance` en Tauri v2,
 * o usa Haversine en TypeScript en navegador PC.
 */
export async function sortBusinessesByDistance<
  T extends { approxLat: number; approxLng: number; distanceKm: number },
>(
  userLat: number,
  userLng: number,
  maxRadiusKm: number,
  businesses: T[]
): Promise<T[]> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const payload = businesses.map((b) => ({
        ...b,
        approx_lat: b.approxLat,
        approx_lng: b.approxLng,
      }));

      const rawJson = await invoke<string>("filter_and_sort_by_distance", {
        userLat,
        userLng,
        maxRadiusKm,
        businessesJson: JSON.stringify(payload),
      });

      const parsed = JSON.parse(rawJson) as Array<T & { distance_km?: number }>;
      return parsed.map((item) => ({
        ...item,
        distanceKm:
          typeof item.distance_km === "number"
            ? item.distance_km
            : haversineDistanceKm(
                userLat,
                userLng,
                item.approxLat,
                item.approxLng
              ),
      }));
    } catch {
      // Fallback a Haversine TS
    }
  }

  return businesses
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

export async function saveOfflineBusinesses<T>(items: T[]): Promise<void> {
  const payload = JSON.stringify(items);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(OFFLINE_BUSINESSES_KEY, payload);
    } catch {
      // Ignore
    }
  }

  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_offline_cache", { payloadJson: payload });
    } catch {
      // Ignore
    }
  }
}

export async function loadOfflineBusinesses<T>(): Promise<T[] | null> {
  if (isTauriEnvironment()) {
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
      const raw = window.localStorage.getItem(OFFLINE_BUSINESSES_KEY);
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
 * Dispara una notificación nativa en Android vía `@tauri-apps/plugin-notification`
 * o comando Rust `notify_favorite_stock`.
 */
export async function triggerNativeStockNotification(
  title: string,
  body: string
): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const notifPlugin = await import("@tauri-apps/plugin-notification");
      let granted = await notifPlugin.isPermissionGranted();
      if (!granted) {
        const perm = await notifPlugin.requestPermission();
        granted = perm === "granted";
      }
      if (granted) {
        notifPlugin.sendNotification({ title, body });
        return;
      }
    } catch {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("notify_favorite_stock", { title, body });
        return;
      } catch {
        // Ignore
      }
    }
  }

  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, { body });
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriEnvironment()) {
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
