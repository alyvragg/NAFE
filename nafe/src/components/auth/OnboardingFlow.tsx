"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  ShoppingBasket,
  Sprout,
  HeartHandshake,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import TextType from "@/components/ui/TextType";
import { OtpInput } from "./OtpInput";
import {
  UserRole,
  validateName,
  validateContact,
  validatePassword,
  formatContactDisplay,
} from "./validators";
import { signUpWithSupabase } from "@/lib/supabase";

interface OnboardingFlowProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

const TOTAL_STEPS = 4;
const DEMO_VALID_OTP = "12345";

const ROLE_OPTIONS: Array<{
  id: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    id: "buyer",
    title: "Busco comprar productos locales",
    description: "Explorar el radar cerca de ti",
    icon: ShoppingBasket,
  },
  {
    id: "seller",
    title: "Busco vender mis productos locales",
    description: "Conectar con vecinos sin comisiones",
    icon: Sprout,
  },
  {
    id: "both",
    title: "Busco ambas, honestamente",
    description: "Comprar y vender en tu comunidad",
    icon: HeartHandshake,
  },
];

export function OnboardingFlow({
  onBack,
  onSwitchToLogin,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form data
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [otpErrorKey, setOtpErrorKey] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [stepInputReady, setStepInputReady] = useState(false);
  const [isCompletedTransition, setIsCompletedTransition] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const contactInputRef = useRef<HTMLInputElement | null>(null);

  // Fade-up the input field right as <TextType /> finishes speaking each conversational step
  useEffect(() => {
    setStepInputReady(false);
    const delayMs = step === 1 ? 1900 : 1400;
    const timer = window.setTimeout(() => {
      setStepInputReady(true);
      if (step === 1) nameInputRef.current?.focus();
      if (step === 2) contactInputRef.current?.focus();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const goToStep = (nextStep: number) => {
    setError(null);
    setInfoMessage(null);
    setStep(nextStep);
  };

  const handleBackNavigation = () => {
    if (isBusy) return;
    if (step === 1) {
      onBack();
    } else {
      goToStep(step - 1);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    goToStep(2);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const validationError = validateContact(contact);
    if (validationError) {
      setError(validationError);
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setError(null);
    setIsBusy(true);

    window.setTimeout(() => {
      setIsBusy(false);
      setOtp("");
      setResendCooldown(30);
      goToStep(3);
    }, 340);
  };

  const verifyOtpCode = (codeToVerify: string) => {
    if (isBusy) return;
    if (codeToVerify.length < 5) {
      setError("Ingresa los 5 dígitos del código que te enviamos.");
      setOtpErrorKey((k) => k + 1);
      return;
    }

    setError(null);
    setIsBusy(true);

    window.setTimeout(() => {
      setIsBusy(false);
      if (codeToVerify !== DEMO_VALID_OTP) {
        setError(
          `El código "${codeToVerify}" no es correcto. Intenta de nuevo (código de verificación: ${DEMO_VALID_OTP}).`
        );
        setOtpErrorKey((k) => k + 1);
        return;
      }

      setInfoMessage("¡Código verificado!");
      window.setTimeout(() => {
        goToStep(4);
      }, 300);
    }, 340);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtpCode(otp);
  };

  const handleResendCode = () => {
    if (resendCooldown > 0 || isBusy) return;
    setError(null);
    setOtp("");
    setResendCooldown(30);
    setInfoMessage("Te enviamos un nuevo código de verificación.");
  };

  const handleFinish = async () => {
    if (!role || isBusy) {
      setError("Elige una opción para personalizar tu experiencia en NAFE.");
      return;
    }

    setError(null);
    setIsBusy(true);
    setInfoMessage("Abriendo tu radar local…");

    const result = await signUpWithSupabase({
      name: name.trim(),
      contact: contact.trim(),
      password,
      role,
    });

    if (!result.ok) {
      setIsBusy(false);
      setInfoMessage(null);
      setError(result.error || "Ocurrió un problema al crear tu cuenta.");
      return;
    }

    setIsCompletedTransition(true);
    setInfoMessage("¡Bienvenido a NAFE! Abriendo radar…");

    window.setTimeout(() => {
      router.push("/radar");
    }, 600);
  };

  const firstName = name.trim().split(/\s+/)[0] || "vecino";
  const isNameReady = name.trim().length >= 2;
  const isContactReady = contact.trim().length >= 5 && password.length >= 6;
  const isOtpReady = otp.length === 5;
  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className={[
        "flex h-full flex-col justify-between transition-colors duration-700",
        isCompletedTransition
          ? "rounded-xl bg-[#DEDED8] p-6 text-[#13150C]"
          : "text-[#DEDED8]",
      ].join(" ")}
    >
      {/* Top Bar: Back Button + Progress Bar */}
      <div className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            aria-label={step === 1 ? "Volver a bienvenida" : "Paso anterior"}
            className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium text-[#DEDED8]/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span>Atrás</span>
          </button>

          <div className="flex flex-1 flex-col gap-1.5">
            <div
              className="h-1.5 w-full overflow-hidden rounded-md bg-white/15"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={`Paso ${step} de ${TOTAL_STEPS}`}
            >
              <motion.div
                className="h-full rounded-md bg-[#DBF7EC]"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <span className="min-w-[44px] text-right text-[12px] font-medium tabular-nums text-[#DEDED8]/65">
            {step} / {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Center Conversational Stage */}
      <div className="nafe-scroll my-auto overflow-y-auto py-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: NAME */}
          {step === 1 && (
            <motion.form
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleNameSubmit}
              noValidate
              className="space-y-6"
            >
              <div className="min-h-[86px]">
                <TextType
                  as="h1"
                  text="Hola... Qué bueno tenerte cerca. Dinos, ¿cuál es tu nombre?"
                  initialDelay={240}
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

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={
                  stepInputReady
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="onboarding-name" className="sr-only">
                    Tu nombre
                  </label>
                  <input
                    ref={nameInputRef}
                    id="onboarding-name"
                    type="text"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    placeholder="Escribe tu nombre (ej. María, José Luis)…"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    className="h-[54px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8] px-4 text-[16px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all duration-200 focus:border-[#3D562F] focus:bg-white focus:ring-4 focus:ring-[#3D562F]/25"
                  />
                </div>

                {error && <ErrorBanner message={error} />}

                <motion.button
                  type="submit"
                  whileTap={isNameReady ? { scale: 0.985 } : undefined}
                  aria-disabled={!isNameReady}
                  className={[
                    "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-semibold text-[#FFFFFF] transition-all duration-200",
                    isNameReady
                      ? "bg-[#3D562F] shadow-[0_8px_24px_rgba(61,86,47,0.35)] hover:bg-[#496639]"
                      : "bg-[#3D562F]/40 text-white/75 cursor-not-allowed",
                  ].join(" ")}
                >
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </motion.button>
              </motion.div>
            </motion.form>
          )}

          {/* STEP 2: CONTACT & PASSWORD */}
          {step === 2 && (
            <motion.form
              key="step-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleContactSubmit}
              noValidate
              className="space-y-6"
            >
              <div className="min-h-[84px]">
                <TextType
                  as="h1"
                  text={`Mucho gusto, ${firstName}. ¿Cuál es tu WhatsApp o correo?`}
                  initialDelay={180}
                  loop={false}
                  typeEffect="fade"
                  cursorStyle="bar"
                  cursorGlide
                  showCursor
                  cursorColor="#DBF7EC"
                  variableSpeed={{ min: 45, max: 85 }}
                  className="font-serif text-[30px] sm:text-[34px] font-medium leading-[1.16] tracking-[-0.015em] text-[#DEDED8]/90"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={
                  stepInputReady
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="onboarding-contact"
                    className="mb-1.5 block text-[13px] font-medium text-[#DEDED8]/80"
                  >
                    WhatsApp (10 dígitos) o correo electrónico
                  </label>
                  <input
                    ref={contactInputRef}
                    id="onboarding-contact"
                    type="text"
                    autoComplete="tel email"
                    placeholder="618 123 4567 o tu@correo.com"
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                      if (error) setError(null);
                    }}
                    className="h-[52px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8] px-4 text-[15.5px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all duration-200 focus:border-[#3D562F] focus:bg-white focus:ring-4 focus:ring-[#3D562F]/25"
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboarding-password"
                    className="mb-1.5 block text-[13px] font-medium text-[#DEDED8]/80"
                  >
                    Crea una contraseña (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Escribe una contraseña segura"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="h-[52px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8] pl-4 pr-12 text-[15.5px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all duration-200 focus:border-[#3D562F] focus:bg-white focus:ring-4 focus:ring-[#3D562F]/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
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

                {error && <ErrorBanner message={error} />}

                <motion.button
                  type="submit"
                  whileTap={isContactReady ? { scale: 0.985 } : undefined}
                  disabled={isBusy}
                  aria-disabled={!isContactReady || isBusy}
                  className={[
                    "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-semibold text-[#FFFFFF] transition-all duration-200",
                    isContactReady
                      ? "bg-[#3D562F] shadow-[0_8px_24px_rgba(61,86,47,0.35)] hover:bg-[#496639]"
                      : "bg-[#3D562F]/40 text-white/75 cursor-not-allowed",
                  ].join(" ")}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enviando código…</span>
                    </>
                  ) : (
                    <span>Enviar código</span>
                  )}
                </motion.button>
              </motion.div>
            </motion.form>
          )}

          {/* STEP 3: 5-DIGIT OTP */}
          {step === 3 && (
            <motion.form
              key="step-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleOtpSubmit}
              noValidate
              className="space-y-6"
            >
              <div className="min-h-[84px]">
                <TextType
                  as="h1"
                  text="Perfecto. ¿Podrías insertar el código de verificación que te enviamos?"
                  initialDelay={180}
                  loop={false}
                  typeEffect="fade"
                  cursorStyle="bar"
                  cursorGlide
                  showCursor
                  cursorColor="#DBF7EC"
                  variableSpeed={{ min: 45, max: 85 }}
                  className="font-serif text-[29px] sm:text-[33px] font-medium leading-[1.16] tracking-[-0.015em] text-[#DEDED8]/90"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={
                  stepInputReady
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <p className="text-[14px] text-[#DEDED8]/75">
                  Enviado a{" "}
                  <span className="font-semibold text-[#DBF7EC]">
                    {formatContactDisplay(contact)}
                  </span>{" "}
                  (código: <strong>{DEMO_VALID_OTP}</strong>)
                </p>

                <OtpInput
                  length={5}
                  value={otp}
                  onChange={(nextVal) => {
                    setOtp(nextVal);
                    if (error) setError(null);
                    if (infoMessage) setInfoMessage(null);
                  }}
                  onComplete={(completedCode) => {
                    verifyOtpCode(completedCode);
                  }}
                  hasError={Boolean(error)}
                  errorKey={otpErrorKey}
                  disabled={isBusy}
                />

                <AnimatePresence mode="wait">
                  {error && <ErrorBanner key="otp-err" message={error} />}
                  {!error && infoMessage && (
                    <motion.div
                      key="otp-info"
                      role="status"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 rounded-md border border-[#3D562F]/30 bg-[#DBF7EC] px-4 py-3 text-[13.5px] font-medium text-[#13150C]"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3D562F]" />
                      <span>{infoMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isBusy}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-[#DBF7EC] transition-opacity disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendCooldown > 0 ? (
                      <span>Reenviar en {resendCooldown}s</span>
                    ) : (
                      <span>Reenviar código</span>
                    )}
                  </button>
                </div>

                <motion.button
                  type="submit"
                  whileTap={isOtpReady ? { scale: 0.985 } : undefined}
                  disabled={isBusy}
                  aria-disabled={!isOtpReady || isBusy}
                  className={[
                    "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-semibold text-[#FFFFFF] transition-all duration-200",
                    isOtpReady
                      ? "bg-[#3D562F] shadow-[0_8px_24px_rgba(61,86,47,0.35)] hover:bg-[#496639]"
                      : "bg-[#3D562F]/40 text-white/75 cursor-not-allowed",
                  ].join(" ")}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verificando…</span>
                    </>
                  ) : (
                    <span>Verificar código</span>
                  )}
                </motion.button>
              </motion.div>
            </motion.form>
          )}

          {/* STEP 4: PURPOSE / ROLE */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="min-h-[76px]">
                <TextType
                  as="h1"
                  text={`Último paso, ${firstName}. ¿Qué buscas en NAFE?`}
                  initialDelay={180}
                  loop={false}
                  typeEffect="fade"
                  cursorStyle="bar"
                  cursorGlide
                  showCursor
                  cursorColor="#DBF7EC"
                  variableSpeed={{ min: 45, max: 85 }}
                  className="font-serif text-[30px] sm:text-[34px] font-medium leading-[1.16] tracking-[-0.015em] text-[#DEDED8]/90"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={
                  stepInputReady
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <div
                  className="space-y-2.5"
                  role="radiogroup"
                  aria-label="Propósito en NAFE"
                >
                  {ROLE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = role === option.id;

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => {
                          setRole(option.id);
                          if (error) setError(null);
                        }}
                        className={[
                          "flex min-h-[74px] w-full items-center gap-3.5 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200",
                          isSelected
                            ? "border-[#3D562F] bg-[#DBF7EC] text-[#13150C]"
                            : "border-[#949172]/40 bg-[#DEDED8] text-[#13150C] hover:bg-white",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                            isSelected
                              ? "bg-[#3D562F] text-[#FFFFFF]"
                              : "bg-[#949172]/25 text-[#3D562F]",
                          ].join(" ")}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.9} />
                        </span>

                        <span className="flex-1">
                          <span className="block text-[14.5px] font-semibold leading-snug text-[#13150C]">
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-[#13150C]/70">
                            {option.description}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
                            isSelected
                              ? "border-[#3D562F] bg-[#3D562F] text-[#FFFFFF]"
                              : "border-[#949172]/50 bg-transparent",
                          ].join(" ")}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {error && <ErrorBanner message={error} />}

                {infoMessage && (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 rounded-md border border-[#3D562F]/30 bg-[#DBF7EC] px-4 py-3 text-[13.5px] font-medium text-[#13150C]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3D562F]" />
                    <span>{infoMessage}</span>
                  </motion.div>
                )}

                <div className="pt-2">
                  <motion.button
                    type="button"
                    whileTap={role ? { scale: 0.985 } : undefined}
                    onClick={handleFinish}
                    disabled={isBusy}
                    aria-disabled={!role || isBusy}
                    className={[
                      "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-semibold text-[#FFFFFF] transition-all duration-200",
                      role
                        ? "bg-[#3D562F] shadow-[0_8px_24px_rgba(61,86,47,0.35)] hover:bg-[#496639]"
                        : "bg-[#3D562F]/40 text-white/75 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Finalizando…</span>
                      </>
                    ) : (
                      <span>Entrar al radar</span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Switch Link */}
      <div className="flex items-center justify-center border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex min-h-[42px] items-center justify-center rounded-lg px-4 text-[13.5px] text-[#DEDED8]/75 transition-colors hover:text-white"
        >
          ¿Ya tienes cuenta?{" "}
          <span className="ml-1.5 font-semibold text-[#DBF7EC] underline decoration-[#DBF7EC]/40 underline-offset-4">
            Inicia sesión
          </span>
        </button>
      </div>
    </motion.div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2.5 rounded-md border border-[#9E4242]/30 bg-[#F7DBDB] px-4 py-3 text-[13.5px] leading-snug text-[#13150C]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#7A2B2B]" />
      <span>{message}</span>
    </motion.div>
  );
}
