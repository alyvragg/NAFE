"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Wifi,
  WifiOff,
  Compass,
  Store,
  RefreshCw,
} from "lucide-react";
import { UserRole } from "@/components/auth/validators";

export type ActiveWorkspaceMode = "buyer" | "seller";

interface HomeHeaderProps {
  userName: string;
  role: UserRole;
  cityLabel: string;
  isLocating: boolean;
  isLocationFallback: boolean;
  onRefreshLocation: () => void;
  activeWorkspace: ActiveWorkspaceMode;
  onChangeWorkspace: (mode: ActiveWorkspaceMode) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export function HomeHeader({
  userName,
  role,
  cityLabel,
  isLocating,
  isLocationFallback,
  onRefreshLocation,
  activeWorkspace,
  onChangeWorkspace,
  isOffline,
  onToggleOffline,
}: HomeHeaderProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "Alex";

  const contextualSubtitle =
    activeWorkspace === "seller"
      ? "Comparte tu producción directa y sin comisiones"
      : "Esto nace cerca de ti hoy";

  const canAccessSellerPanel = role === "seller" || role === "both";

  return (
    <header className="space-y-3 pb-3">
      {/* Top Navbar: Official Logo on Left, Real Location + Refresh & Network Status on Right */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 focus:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="NAFE"
            className="h-9 w-auto object-contain"
          />
          <span className="font-serif text-xl font-medium tracking-[0.18em] text-[#13150C]/80">
            NAFE
          </span>
        </Link>

        {/* Real Nominatim Location Button (with manual GPS refresh) + Network Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshLocation}
            disabled={isLocating}
            title={
              isLocationFallback
                ? "Ubicación aproximada. Toca para actualizar tu GPS."
                : "Actualizar mi ubicación GPS"
            }
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors",
              isLocationFallback
                ? "border-[#949172]/55 bg-[#F7DBDB]/55 text-[#13150C]"
                : "border-[#949172]/40 bg-white/70 text-[#13150C]/85 hover:border-[#3D562F] hover:bg-white",
            ].join(" ")}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3D562F]" />
            <span className="max-w-[155px] truncate sm:max-w-[230px]">
              {isLocating ? "Obteniendo ubicación…" : cityLabel}
            </span>
            <RefreshCw
              className={`h-3 w-3 shrink-0 text-[#949172] ${
                isLocating ? "animate-spin text-[#3D562F]" : ""
              }`}
            />
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onToggleOffline}
            aria-pressed={isOffline}
            title="Alternar modo sin conexión"
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-all duration-200",
              isOffline
                ? "border-[#9E4242]/40 bg-[#F7DBDB] text-[#13150C]"
                : "border-[#3D562F]/30 bg-[#DBF7EC] text-[#3D562F]",
            ].join(" ")}
          >
            {isOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[#7A2B2B]" />
                <span>Sin conexión</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-[#3D562F]" />
                <span>En línea</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Soft Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 rounded-md border border-[#949172]/45 bg-[#F7DBDB] px-3.5 py-2.5 text-[12.5px] font-medium text-[#13150C]">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 shrink-0 text-[#7A2B2B]" />
                <span>Sin conexión · Datos guardados</span>
              </div>
              <button
                type="button"
                onClick={onToggleOffline}
                className="shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold text-[#13150C] hover:bg-white"
              >
                Reconectar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Greeting + Discrete "Mi puesto" Toggle only if user role is seller or both */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-0.5">
        <div>
          <h1 className="font-serif text-[30px] sm:text-[32px] font-medium leading-[1.12] tracking-[-0.015em] text-[#13150C]/80">
            Hola, <span className="italic">{firstName}</span>
          </h1>
          <p className="mt-1 text-[14px] text-[#13150C]/65">
            {contextualSubtitle}
          </p>
        </div>

        {canAccessSellerPanel && (
          <div
            className="inline-flex items-center gap-1 rounded-lg border border-[#949172]/35 bg-white/60 p-1"
            role="tablist"
            aria-label="Alternar entre Explorar cerca y Mi puesto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspace === "buyer"}
              onClick={() => onChangeWorkspace("buyer")}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                activeWorkspace === "buyer"
                  ? "bg-[#3D562F] text-[#DEDED8] shadow-2xs"
                  : "text-[#13150C]/75 hover:text-[#13150C]",
              ].join(" ")}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explorar cerca</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspace === "seller"}
              onClick={() => onChangeWorkspace("seller")}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                activeWorkspace === "seller"
                  ? "bg-[#3D562F] text-[#DEDED8] shadow-2xs"
                  : "text-[#13150C]/75 hover:text-[#13150C]",
              ].join(" ")}
            >
              <Store className="h-3.5 w-3.5" />
              <span>Mi puesto</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
