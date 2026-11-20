"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#DEDED8] text-[#13150C]">
      {/* =====================================================================
          BASE LAYER: WELCOME VIEW (PC SPLIT-SCREEN OR MOBILE TAURI SHELL)
      ===================================================================== */}
      {platform === "pc" ? (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#DEDED8] text-[#13150C]">
          {/* Minimalist Clean Header */}
          <header className="mx-auto flex w-full max-w-[1280px] shrink-0 items-center justify-between px-6 pt-5 pb-3">
            <button
              type="button"
              onClick={() => setMode("welcome")}
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
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#949172]/45 bg-white/60 px-4 text-[13.5px] font-semibold text-[#13150C] transition-colors hover:border-[#3D562F] hover:bg-white"
              >
                Iniciar sesión
              </button>

              <Link
                href="/radar"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#3D562F] px-4 text-[13.5px] font-semibold text-[#FFFFFF] transition-colors hover:bg-[#334827]"
              >
                <span>Explorar radar</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {/* Main Split-Screen Desktop Workspace */}
          <main className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 gap-6 overflow-hidden px-6 pt-2 pb-6 lg:grid-cols-12">
            {/* LEFT: CLEAN STOCK VIDEO CONTAINER (7 columns) */}
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
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.svg"
                    alt="NAFE"
                    className="h-12 w-auto object-contain"
                  />
                  <h1 className="max-w-[460px] font-serif text-[38px] leading-[1.12] font-medium tracking-[-0.015em] text-[#DEDED8]/80 xl:text-[44px]">
                    Confianza en lo que nace cerca.
                  </h1>
                </div>
              </div>
            </section>

            {/* RIGHT: WELCOME ACTION CARD (5 columns) */}
            <section className="flex flex-col justify-center overflow-hidden rounded-xl border border-[#949172]/35 bg-[#E6E6E0] p-7 lg:col-span-5 lg:p-10">
              <div className="space-y-7">
                <div>
                  <h2 className="font-serif text-[34px] font-medium leading-[1.14] text-[#13150C]/80">
                    Explora o publica lo que nace hoy en tu comunidad.
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#13150C]/70">
                    Encuentra alimentos frescos, viveros, cantera, talleres y
                    oficios locales cerca de ti, con trato directo y puntos de
                    encuentro seguros.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setMode("register")}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#3D562F] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(61,86,47,0.2)] transition-colors hover:bg-[#334827]"
                  >
                    <span>Regístrate</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setMode("login")}
                    className="flex h-[52px] w-full items-center justify-center rounded-lg border border-[#949172]/50 bg-[#DEDED8] px-6 text-[15px] font-semibold text-[#13150C] transition-colors hover:bg-white/80"
                  >
                    Iniciar sesión
                  </motion.button>

                  <div className="pt-2 text-center">
                    <Link
                      href="/radar"
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-4 text-[14px] font-semibold text-[#3D562F] underline decoration-[#3D562F]/40 underline-offset-4 hover:text-[#2B3E21]"
                    >
                      <span>Explorar radar sin cuenta</span>
                      <ArrowRight className="h-3.5 w-3.5" />
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
              : "relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#C9C8BE] sm:p-4"
          }
        >
          <main
            className={
              forcedMobile
                ? "relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#13150C]"
                : "relative flex h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden bg-[#13150C] sm:h-[min(860px,92dvh)] sm:rounded-2xl sm:shadow-[0_24px_70px_rgba(19,21,12,0.22)]"
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

            <header className="relative z-10 flex flex-col items-center pt-[max(3.75rem,calc(env(safe-area-inset-top)+2.5rem))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="NAFE"
                className="h-12 w-auto object-contain"
              />
            </header>

            <section className="relative z-10 rounded-t-xl border-t border-white/25 bg-[#DEDED8]/45 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <h1 className="mx-auto max-w-[310px] text-center font-serif text-[30px] font-medium leading-[1.16] tracking-[-0.015em] text-[#13150C]/80">
                Confianza en lo que nace cerca.
              </h1>

              <div className="mt-7 flex flex-col gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setMode("register")}
                  className="flex h-[52px] w-full items-center justify-center rounded-lg bg-[#3D562F] px-6 text-[15.5px] font-semibold text-[#FFFFFF] shadow-[0_8px_20px_rgba(61,86,47,0.25)] transition-colors hover:bg-[#334827]"
                >
                  Regístrate
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setMode("login")}
                  className="flex h-[52px] w-full items-center justify-center rounded-lg bg-[#DEDED8]/90 px-6 text-[15.5px] font-semibold text-[#13150C] backdrop-blur-md transition-colors hover:bg-[#DEDED8]"
                >
                  Iniciar sesión
                </motion.button>
              </div>

              <div className="mt-2.5 flex justify-center">
                <Link
                  href="/radar"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-lg px-4 text-[13.5px] font-medium text-[#13150C]/80 underline decoration-[#13150C]/35 underline-offset-4 hover:text-[#13150C]"
                >
                  Explorar radar sin cuenta
                </Link>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* =====================================================================
          IMMERSIVE BLACKOUT CURTAIN ("LA PÁGINA SE APAGA Y TE HABLA")
          Darkens the screen to #13150C and speaks directly via <TextType />
      ===================================================================== */}
      <AnimatePresence>
        {isImmersiveDark && (
          <motion.div
            key="immersive-blackout-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: CURTAIN_EASE }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#13150C] text-[#DEDED8]"
          >
            {/* Subtle warm radial glow in deep darkness */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#3D562F]/15 blur-3xl" />
            </div>

            <div className="relative z-10 flex h-full w-full max-w-[540px] flex-col justify-between px-6 py-6 sm:py-10">
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
