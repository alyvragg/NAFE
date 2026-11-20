"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import TextType from "@/components/ui/TextType";
import { validateContact, validatePassword } from "./validators";
import { signInWithSupabase } from "@/lib/supabase";

interface LoginFormProps {
  onBack: () => void;
  onSwitchToRegister: () => void;
}

const LOGIN_SPEECH =
  "Hola... Qué bueno tenerte cerca. Bienvenido de vuelta.";

export function LoginForm({ onBack, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusNote, setStatusNote] = useState<string>(
    "¡Listo! Abriendo tu radar local…"
  );

  // Reveal form inputs with a clean fade-up right as TextType finishes speaking
  const [inputsReady, setInputsReady] = useState(false);

  useEffect(() => {
    setInputsReady(false);
    const timer = window.setTimeout(() => {
      setInputsReady(true);
    }, 1850);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    const contactError = validateContact(identifier);
    if (contactError) {
      setError(contactError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await signInWithSupabase({
      identifier,
      password,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(
        result.error ||
          "No pudimos iniciar sesión. Verifica tu WhatsApp/correo y contraseña."
      );
      return;
    }

    setStatusNote(
      `¡Hola de nuevo, ${result.profile?.name.split(/\s+/)[0] || "vecino"}! Abriendo radar…`
    );

    setIsSuccess(true);

    window.setTimeout(() => {
      router.push("/radar");
    }, 650);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className={[
        "flex h-full flex-col justify-between transition-colors duration-700",
        isSuccess ? "rounded-xl bg-[#DEDED8] p-6 text-[#13150C]" : "text-[#DEDED8]",
      ].join(" ")}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a la bienvenida"
          className="-ml-2 inline-flex h-11 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium text-[#DEDED8]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          <span>Volver</span>
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="NAFE"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Center Stage: App Speaks with <TextType /> + Fade-Up Form */}
      <div className="my-auto py-6">
        <div className="min-h-[88px]">
          <TextType
            as="h1"
            text={LOGIN_SPEECH}
            initialDelay={260}
            loop={false}
            typeEffect="fade"
            cursorStyle="bar"
            cursorGlide
            showCursor
            cursorColor="#DBF7EC"
            variableSpeed={{ min: 45, max: 85 }}
            className="font-serif text-[32px] sm:text-[36px] font-medium leading-[1.16] tracking-[-0.015em] text-[#DEDED8]/90"
          />
        </div>

        {/* Inputs appear with a clean fade-up once TextType speaks */}
        <motion.form
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: 18 }}
          animate={
            inputsReady
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 18 }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="login-identifier"
              className="block text-[13px] font-medium text-[#DEDED8]/80"
            >
              Tu WhatsApp o correo electrónico
            </label>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              placeholder="618 123 4567 o tu@correo.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              className="h-[52px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8] px-4 text-[15px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all duration-200 focus:border-[#3D562F] focus:bg-white focus:ring-4 focus:ring-[#3D562F]/25"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-[13px] font-medium text-[#DEDED8]/80"
            >
              Tu contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="h-[52px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8] pl-4 pr-12 text-[15px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all duration-200 focus:border-[#3D562F] focus:bg-white focus:ring-4 focus:ring-[#3D562F]/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#13150C]/65 hover:text-[#13150C]"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="login-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 rounded-md border border-[#9E4242]/30 bg-[#F7DBDB] px-4 py-3 text-[13.5px] leading-snug text-[#13150C]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#7A2B2B]" />
                <span>{error}</span>
              </motion.div>
            )}

            {isSuccess && (
              <motion.div
                key="login-success"
                role="status"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 rounded-md border border-[#3D562F]/30 bg-[#DBF7EC] px-4 py-3 text-[13.5px] font-medium text-[#13150C]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3D562F]" />
                <span>{statusNote}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.985 }}
              disabled={isSubmitting || isSuccess}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#3D562F] px-6 text-[15px] font-semibold text-[#FFFFFF] shadow-[0_8px_24px_rgba(61,86,47,0.35)] transition-all duration-200 hover:bg-[#496639] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ingresando…</span>
                </>
              ) : isSuccess ? (
                <span>Entrando a NAFE…</span>
              ) : (
                <span>Continuar al radar</span>
              )}
            </motion.button>
          </div>
        </motion.form>
      </div>

      {/* Bottom Switch Link */}
      <div className="flex items-center justify-center border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-[14px] text-[#DEDED8]/75 transition-colors hover:text-white"
        >
          ¿Aún no tienes cuenta?{" "}
          <span className="ml-1.5 font-semibold text-[#DBF7EC] underline decoration-[#DBF7EC]/40 underline-offset-4">
            Regístrate
          </span>
        </button>
      </div>
    </motion.div>
  );
}
