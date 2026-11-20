"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
  const [statusNote, setStatusNote] = useState<string>("Abriendo radar…");

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
      setError(result.error || "Credenciales inválidas.");
      return;
    }

    setStatusNote("Abriendo radar…");
    setIsSuccess(true);

    window.setTimeout(() => {
      router.push("/radar");
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={[
        "flex h-full flex-col justify-between transition-colors duration-700",
        isSuccess
          ? "rounded-xl bg-[#F7F7F4] p-6 text-[#13150C]"
          : "text-[#F7F7F4]",
      ].join(" ")}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="-ml-1 inline-flex items-center gap-1.5 bg-transparent p-1.5 text-sm font-medium text-[#F7F7F4]/75 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
          <span>Volver</span>
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="NAFE"
          className="h-7 w-auto object-contain"
        />
      </div>

      {/* Center Stage */}
      <div className="my-auto py-6">
        <div className="min-h-[80px]">
          <TextType
            as="h1"
            text={LOGIN_SPEECH}
            initialDelay={260}
            loop={false}
            typeEffect="fade"
            cursorStyle="bar"
            cursorGlide
            showCursor
            cursorColor="#F4F7F4"
            variableSpeed={{ min: 45, max: 85 }}
            className="font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-[#F7F7F4]/95 sm:text-3xl"
          />
        </div>

        <motion.form
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: 14 }}
          animate={
            inputsReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
          }
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 space-y-3"
        >
          <input
            id="login-identifier"
            type="text"
            autoComplete="username"
            placeholder="WhatsApp o correo"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (error) setError(null);
            }}
            className="h-11 w-full rounded-lg bg-[#EFEFEA] px-3.5 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none transition-colors focus:bg-[#FFFFFF]"
          />

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className="h-11 w-full rounded-lg bg-[#EFEFEA] pl-3.5 pr-16 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none transition-colors focus:bg-[#FFFFFF]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent p-1 text-xs font-medium text-[#6E6D5F] hover:text-[#13150C]"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="login-error"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-md bg-[#F2DCDC] px-3.5 py-2.5 text-xs font-medium text-[#7A2727]"
              >
                {error}
              </motion.div>
            )}

            {isSuccess && (
              <motion.div
                key="login-success"
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-md bg-[#1F3A26] px-3.5 py-2.5 text-xs font-medium text-[#F4F7F4]"
              >
                {statusNote}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-6 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820] disabled:opacity-70"
            >
              {isSubmitting
                ? "Ingresando…"
                : isSuccess
                  ? "Entrando…"
                  : "Continuar"}
            </button>
          </div>
        </motion.form>
      </div>

      {/* Bottom Switch Link */}
      <div className="flex items-center justify-center pt-3">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm text-[#F7F7F4]/75 transition-colors hover:text-white"
        >
          ¿Sin cuenta?{" "}
          <span className="ml-1.5 font-medium text-[#F4F7F4] underline underline-offset-4">
            Regístrate
          </span>
        </button>
      </div>
    </motion.div>
  );
}
