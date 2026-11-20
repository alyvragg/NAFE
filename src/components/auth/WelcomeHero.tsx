"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./LoginForm";
import { OnboardingFlow } from "./OnboardingFlow";
import { usePlatform } from "@/lib/platform";

type AuthMode = "welcome" | "login" | "register";

const CURTAIN_EASE = [0.22, 1, 0.36, 1] as const;
const HERO_VIDEO_SRC = "/videos/16984992_2160_3840_30fps.mp4";

interface WelcomeHeroProps {
  forcedMobile?: boolean;
}

export function WelcomeHero({ forcedMobile = false }: WelcomeHeroProps) {
  const { platform: detectedPlatform } = usePlatform();
  const platform = forcedMobile ? "mobile" : detectedPlatform;
  const [mode, setMode] = useState<AuthMode>("welcome");

  const isImmersiveDark = mode !== "welcome";

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#F7F7F4] text-[#13150C]">
      {platform === "pc" ? (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F7F7F4] text-[#13150C]">
          <header className="mx-auto flex w-full max-w-[1280px] shrink-0 items-center justify-between px-6 pt-5 pb-3">
            <button
              type="button"
              onClick={() => setMode("welcome")}
              className="inline-flex items-center gap-2 focus:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="NAFE"
                className="h-8 w-auto object-contain"
              />
              <span className="text-sm font-semibold tracking-[0.16em] text-[#13150C]">
                NAFE
              </span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#FFFFFF] px-3.5 text-sm font-medium text-[#13150C] shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-colors hover:bg-[#EFEFEA]"
              >
                Iniciar sesión
              </button>

              <Link
                href="/radar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2B4628] px-3.5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
              >
                Explorar radar
              </Link>
            </div>
          </header>

          <main className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 gap-6 overflow-hidden px-6 pt-2 pb-6 lg:grid-cols-12">
            {/* LEFT: STOCK VIDEO CONTAINER */}
            <section className="relative min-h-[300px] overflow-hidden rounded-2xl bg-[#13150C] lg:col-span-7">
              <video
                src={HERO_VIDEO_SRC}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13150C]/70 via-[#13150C]/20 to-transparent"
              />
              <div className="relative z-10 flex h-full flex-col justify-end p-8 lg:p-10">
                <div className="space-y-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.svg"
                    alt="NAFE"
                    className="h-10 w-auto object-contain"
                  />
                  <h1 className="max-w-[420px] font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-[#F7F7F4] sm:text-3xl">
                    Confianza en lo que nace cerca.
                  </h1>
                </div>
              </div>
            </section>

            {/* RIGHT: WELCOME ACTION CARD */}
            <section className="flex flex-col justify-center overflow-hidden rounded-2xl bg-[#FFFFFF] p-7 shadow-[0_2px_10px_rgba(19,21,12,0.04)] lg:col-span-5 lg:p-10">
              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-medium leading-tight text-[#13150C]/80 sm:text-3xl">
                  Conecta directo con productores de tu comunidad.
                </h2>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-6 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
                  >
                    Regístrate
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#EFEFEA] px-6 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#e5e5de]"
                  >
                    Iniciar sesión
                  </button>

                  <div className="pt-1 text-center">
                    <Link
                      href="/radar"
                      className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-[#2B4628] hover:underline"
                    >
                      Explorar radar
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      ) : (
        /* MOBILE / TAURI WELCOME SHELL */
        <div
          className={
            forcedMobile
              ? "relative flex h-full w-full flex-col overflow-hidden bg-[#13150C]"
              : "relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#EFEFEA] sm:p-4"
          }
        >
          <main
            className={
              forcedMobile
                ? "relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#13150C]"
                : "relative flex h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden bg-[#13150C] sm:h-[min(860px,92dvh)] sm:rounded-2xl sm:shadow-[0_24px_70px_rgba(19,21,12,0.18)]"
            }
          >
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
              <video
                src={HERO_VIDEO_SRC}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#13150C]/75 via-[#13150C]/20 to-transparent" />
            </div>

            <header className="relative z-10 flex flex-col items-center pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="NAFE"
                className="h-10 w-auto object-contain"
              />
            </header>

            <section className="relative z-10 rounded-t-2xl bg-[#F7F7F4]/92 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <h1 className="mx-auto max-w-[300px] text-center font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-[#13150C]/80 sm:text-3xl">
                Confianza en lo que nace cerca.
              </h1>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-6 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
                >
                  Regístrate
                </button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#EFEFEA] px-6 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#FFFFFF]"
                >
                  Iniciar sesión
                </button>
              </div>

              <div className="mt-2 flex justify-center">
                <Link
                  href="/radar"
                  className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-[#6E6D5F] hover:text-[#13150C]"
                >
                  Explorar radar
                </Link>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* IMMERSIVE BLACKOUT CURTAIN */}
      <AnimatePresence>
        {isImmersiveDark && (
          <motion.div
            key="immersive-blackout-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: CURTAIN_EASE }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#13150C] text-[#F7F7F4]"
          >
            <div className="relative z-10 flex h-full w-full max-w-[520px] flex-col justify-between px-6 py-6 sm:py-10">
              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <LoginForm
                    key="immersive-login"
                    onBack={() => setMode("welcome")}
                    onSwitchToRegister={() => setMode("register")}
                  />
                )}

                {mode === "register" && (
                  <OnboardingFlow
                    key="immersive-register"
                    onBack={() => setMode("welcome")}
                    onSwitchToLogin={() => setMode("login")}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
