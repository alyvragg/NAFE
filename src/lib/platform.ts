"use client";

import { useState, useEffect, useCallback } from "react";

export type PlatformMode = "pc" | "mobile";
export type PlatformOverride = "auto" | "pc" | "mobile";

export interface PlatformInfo {
  /** Effective layout mode: "pc" for desktop web, "mobile" for Tauri APK / mobile devices */
  platform: PlatformMode;
  /** Automatically detected platform before any manual testing override */
  detectedPlatform: PlatformMode;
  /** Human-readable OS / environment label */
  osLabel: string;
  /** Whether running inside Tauri v2 container */
  isTauri: boolean;
  /** Current manual override ("auto" uses real OS detection) */
  override: PlatformOverride;
  /** Change override to preview PC or Tauri Mobile APK on any device */
  setOverride: (next: PlatformOverride) => void;
  /** Mounted flag for hydration safety */
  mounted: boolean;
}

const OVERRIDE_STORAGE_KEY = "nafe_platform_override_v1";
const PLATFORM_EVENT_NAME = "nafe-platform-override-change";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  }
}

export function detectEnvironment(): {
  detectedPlatform: PlatformMode;
  osLabel: string;
  isTauri: boolean;
} {
  if (typeof window === "undefined") {
    return {
      detectedPlatform: "mobile",
      osLabel: "Cargando entorno…",
      isTauri: false,
    };
  }

  const ua = window.navigator.userAgent || "";
  const isTauri =
    Boolean(window.__TAURI_INTERNALS__) ||
    Boolean(window.__TAURI__) ||
    window.location.hostname === "tauri.localhost" ||
    window.location.protocol === "tauri:" ||
    ua.includes("Tauri");

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobileUA =
    isAndroid ||
    isIOS ||
    /webOS|BlackBerry|IEMobile|Opera Mini|Mobile|wv/i.test(ua);

  let osName = "Escritorio";
  if (isTauri && isAndroid) {
    osName = "Android · App Tauri";
  } else if (isTauri) {
    osName = "App Tauri Nativa";
  } else if (isAndroid) {
    osName = "Android";
  } else if (isIOS) {
    osName = "iOS";
  } else if (/Windows/i.test(ua)) {
    osName = "Windows PC";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    osName = "macOS";
  } else if (/Linux/i.test(ua)) {
    osName = "Linux PC";
  }

  // If running in Tauri APK or on a mobile OS (or narrow mobile screen < 768px), classify as mobile
  const isNarrowViewport = window.innerWidth < 768;
  const detectedPlatform: PlatformMode =
    isTauri || isMobileUA || isNarrowViewport ? "mobile" : "pc";

  return {
    detectedPlatform,
    osLabel: osName,
    isTauri,
  };
}

export function usePlatform(): PlatformInfo {
  const [mounted, setMounted] = useState(false);
  const [detected, setDetected] = useState<{
    detectedPlatform: PlatformMode;
    osLabel: string;
    isTauri: boolean;
  }>({
    detectedPlatform: "mobile",
    osLabel: "Detectando sistema…",
    isTauri: false,
  });
  const [override, setOverrideState] = useState<PlatformOverride>("auto");

  const refreshDetection = useCallback(() => {
    setDetected(detectEnvironment());
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshDetection();

    try {
      const saved = window.localStorage.getItem(
        OVERRIDE_STORAGE_KEY
      ) as PlatformOverride | null;
      if (saved === "pc" || saved === "mobile" || saved === "auto") {
        setOverrideState(saved);
      }
    } catch {
      // Ignore storage errors
    }

    const handleResize = () => {
      refreshDetection();
    };

    const handleCustomChange = (e: Event) => {
      const detail = (e as CustomEvent<PlatformOverride>).detail;
      if (detail) {
        setOverrideState(detail);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener(PLATFORM_EVENT_NAME, handleCustomChange);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(PLATFORM_EVENT_NAME, handleCustomChange);
    };
  }, [refreshDetection]);

  const setOverride = useCallback((next: PlatformOverride) => {
    setOverrideState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(OVERRIDE_STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      window.dispatchEvent(
        new CustomEvent<PlatformOverride>(PLATFORM_EVENT_NAME, { detail: next })
      );
    }
  }, []);

  const effectivePlatform: PlatformMode =
    override === "auto" ? detected.detectedPlatform : override;

  return {
    platform: effectivePlatform,
    detectedPlatform: detected.detectedPlatform,
    osLabel: detected.osLabel,
    isTauri: detected.isTauri,
    override,
    setOverride,
    mounted,
  };
}
