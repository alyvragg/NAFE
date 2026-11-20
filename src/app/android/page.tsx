"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WelcomeHero } from "@/components/auth/WelcomeHero";
import { NafeHomeApp } from "@/components/home/NafeHomeApp";

type EmulatorScreen = "radar" | "login";
type DevicePreset = "pixel" | "compact";

export default function AndroidEmulatorPage() {
  const [screen, setScreen] = useState<EmulatorScreen>("radar");
  const [device, setDevice] = useState<DevicePreset>("pixel");

  const dimensions =
    device === "pixel"
      ? { width: 412, height: 844, label: "412 × 844" }
      : { width: 360, height: 760, label: "360 × 760" };

  return (
    <div className="min-h-dvh w-full bg-[#13150C] px-4 py-6 text-[#F7F7F4]">
      <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        {/* Left Emulator Controls */}
        <aside className="w-full max-w-[340px] space-y-4 rounded-xl bg-[#1C2014] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="NAFE"
                className="h-7 w-auto object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-[#F7F7F4]">
                Android
              </span>
            </div>
            <Link
              href="/radar"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-[#F7F7F4]/85 hover:bg-white/15"
            >
              Salir
            </Link>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[#F7F7F4]/60">
              Pantalla
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScreen("radar")}
                className={[
                  "h-9 rounded-lg text-xs font-semibold transition-colors",
                  screen === "radar"
                    ? "bg-[#2B4628] text-[#F7F7F4]"
                    : "bg-black/25 text-[#F7F7F4]/80 hover:bg-black/40",
                ].join(" ")}
              >
                Radar
              </button>
              <button
                type="button"
                onClick={() => setScreen("login")}
                className={[
                  "h-9 rounded-lg text-xs font-semibold transition-colors",
                  screen === "login"
                    ? "bg-[#2B4628] text-[#F7F7F4]"
                    : "bg-black/25 text-[#F7F7F4]/80 hover:bg-black/40",
                ].join(" ")}
              >
                Acceso
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[#F7F7F4]/60">
              Resolución
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDevice("pixel")}
                className={[
                  "h-9 rounded-lg text-xs font-semibold transition-colors",
                  device === "pixel"
                    ? "bg-[#1F3A26] text-[#F4F7F4]"
                    : "bg-black/25 text-[#F7F7F4]/80 hover:bg-black/40",
                ].join(" ")}
              >
                412 × 844
              </button>
              <button
                type="button"
                onClick={() => setDevice("compact")}
                className={[
                  "h-9 rounded-lg text-xs font-semibold transition-colors",
                  device === "compact"
                    ? "bg-[#1F3A26] text-[#F4F7F4]"
                    : "bg-black/25 text-[#F7F7F4]/80 hover:bg-black/40",
                ].join(" ")}
              >
                360 × 760
              </button>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg bg-black/30 p-3 text-xs text-[#F7F7F4]/80">
            <span className="block font-semibold text-[#F4F7F4]">
              Compilar APK (Tauri v2)
            </span>
            <pre className="overflow-x-auto rounded-md bg-black/50 p-2 font-mono text-[11px] text-[#F4F7F4]">
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
            className="relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F4] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            {/* Status Bar */}
            <div className="flex h-6 shrink-0 items-center justify-between bg-[#13150C] px-4 text-[11px] font-medium text-[#F7F7F4]">
              <span>17:45</span>
              <span>5G · 100%</span>
            </div>

            {/* Live App Viewport */}
            <div className="relative flex-1 overflow-hidden">
              {screen === "radar" ? (
                <NafeHomeApp forcedMobile />
              ) : (
                <WelcomeHero forcedMobile />
              )}
            </div>

            {/* Gesture Pill */}
            <div className="flex h-4 shrink-0 items-center justify-center bg-[#F7F7F4]">
              <div className="h-1 w-24 rounded-sm bg-[#13150C]/20" />
            </div>
          </div>

          <span className="mt-2.5 text-xs text-[#F7F7F4]/60">
            {dimensions.label}
          </span>
        </div>
      </div>
    </div>
  );
}
