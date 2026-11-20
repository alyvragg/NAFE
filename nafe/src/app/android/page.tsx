"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Smartphone, Wifi, Battery, Signal, ArrowLeft } from "lucide-react";
import { WelcomeHero } from "@/components/auth/WelcomeHero";
import { NafeHomeApp } from "@/components/home/NafeHomeApp";

type EmulatorScreen = "radar" | "login";
type DevicePreset = "pixel" | "compact";

export default function AndroidEmulatorPage() {
  const [screen, setScreen] = useState<EmulatorScreen>("radar");
  const [device, setDevice] = useState<DevicePreset>("pixel");

  const dimensions =
    device === "pixel"
      ? { width: 412, height: 844, label: "Android 412 × 844" }
      : { width: 360, height: 760, label: "Compacto 360 × 760" };

  return (
    <div className="min-h-dvh w-full bg-[#1C1F14] px-4 py-6 text-[#DEDED8]">
      <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        {/* Left Emulator Controls (Outside the App UI) */}
        <aside className="w-full max-w-[360px] space-y-5 rounded-xl border border-[#949172]/30 bg-[#25291B] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="NAFE"
                className="h-8 w-auto object-contain"
              />
              <span className="font-serif text-xl font-medium text-[#DEDED8]">
                Emulador Android
              </span>
            </div>
            <Link
              href="/radar"
              className="inline-flex items-center gap-1 rounded-lg border border-[#949172]/40 px-2.5 py-1.5 text-[12px] font-medium text-[#DEDED8]/85 hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Salir</span>
            </Link>
          </div>

          <p className="text-[13.5px] leading-relaxed text-[#DEDED8]/75">
            Previsualiza en tiempo real la versión móvil de NAFE exactamente
            como corre dentro del WebView de Android en Tauri v2.
          </p>

          {/* Screen Switcher */}
          <div className="space-y-2">
            <span className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#949172]">
              Pantalla activa
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScreen("radar")}
                className={[
                  "h-10 rounded-lg border text-[13px] font-semibold transition-colors",
                  screen === "radar"
                    ? "border-[#3D562F] bg-[#3D562F] text-white"
                    : "border-[#949172]/35 bg-black/20 text-[#DEDED8]/80 hover:bg-black/35",
                ].join(" ")}
              >
                Radar / Mi Puesto
              </button>
              <button
                type="button"
                onClick={() => setScreen("login")}
                className={[
                  "h-10 rounded-lg border text-[13px] font-semibold transition-colors",
                  screen === "login"
                    ? "border-[#3D562F] bg-[#3D562F] text-white"
                    : "border-[#949172]/35 bg-black/20 text-[#DEDED8]/80 hover:bg-black/35",
                ].join(" ")}
              >
                Bienvenida / Login
              </button>
            </div>
          </div>

          {/* Device Size Preset */}
          <div className="space-y-2">
            <span className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#949172]">
              Resolución Android
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDevice("pixel")}
                className={[
                  "h-10 rounded-lg border text-[12.5px] font-semibold transition-colors",
                  device === "pixel"
                    ? "border-[#DBF7EC]/50 bg-[#DBF7EC] text-[#13150C]"
                    : "border-[#949172]/35 bg-black/20 text-[#DEDED8]/80 hover:bg-black/35",
                ].join(" ")}
              >
                412 × 844
              </button>
              <button
                type="button"
                onClick={() => setDevice("compact")}
                className={[
                  "h-10 rounded-lg border text-[12.5px] font-semibold transition-colors",
                  device === "compact"
                    ? "border-[#DBF7EC]/50 bg-[#DBF7EC] text-[#13150C]"
                    : "border-[#949172]/35 bg-black/20 text-[#DEDED8]/80 hover:bg-black/35",
                ].join(" ")}
              >
                360 × 760
              </button>
            </div>
          </div>

          {/* Quick APK Build Guide */}
          <div className="space-y-2 rounded-lg border border-[#949172]/25 bg-black/25 p-3.5 text-[12px] text-[#DEDED8]/80">
            <div className="flex items-center gap-1.5 font-semibold text-[#DBF7EC]">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Compilar APK Real (Tauri v2)</span>
            </div>
            <p className="leading-relaxed">
              Con Rust y Android Studio instalados, ejecuta dentro de{" "}
              <code className="text-[#DBF7EC]">nafe/</code>:
            </p>
            <pre className="overflow-x-auto rounded-md bg-black/50 p-2.5 font-mono text-[11px] text-[#DBF7EC]">
              {`npx tauri android init\nnpx tauri android build --apk --debug`}
            </pre>
          </div>
        </aside>

        {/* Right: Interactive Android Smartphone Frame */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }}
            className="relative flex flex-col overflow-hidden rounded-2xl border-[8px] border-[#0E1009] bg-[#DEDED8] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            {/* Simulated Android Status Bar */}
            <div className="flex h-7 shrink-0 items-center justify-between bg-[#13150C] px-4 text-[11px] font-medium text-[#DEDED8]">
              <span>17:45</span>
              <div className="flex items-center gap-2">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Live App Viewport */}
            <div className="relative flex-1 overflow-hidden">
              {screen === "radar" ? (
                <NafeHomeApp forcedMobile />
              ) : (
                <WelcomeHero forcedMobile />
              )}
            </div>

            {/* Simulated Android Gesture Pill */}
            <div className="flex h-4 shrink-0 items-center justify-center bg-[#DEDED8]">
              <div className="h-1 w-24 rounded-sm bg-[#13150C]/25" />
            </div>
          </div>

          <span className="mt-3 text-[12px] text-[#DEDED8]/60">
            {dimensions.label} · Vista móvil Tauri v2
          </span>
        </div>
      </div>
    </div>
  );
}
