"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import TextType from "@/components/ui/TextType";
import { OtpInput } from "./OtpInput";
import {
  UserRole,
  SubscriptionTier,
  validateName,
  validateContact,
  validatePassword,
  formatContactDisplay,
} from "./validators";
import {
  checkAccountExistsInSupabase,
  requestOtpCodeInSupabase,
  verifyOtpCodeInSupabase,
  signUpWithSupabase,
  upgradeSubscriptionTier,
} from "@/lib/supabase";
import { PLAN_LIST } from "@/lib/plans";

interface OnboardingFlowProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

const TOTAL_STEPS = 5;

const ROLE_OPTIONS: Array<{
  id: UserRole;
  title: string;
}> = [
  { id: "buyer", title: "Comprador" },
  { id: "seller", title: "Productor" },
  { id: "both", title: "Ambos" },
];

export function OnboardingFlow({
  onBack,
  onSwitchToLogin,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  // Real Supabase OTP state
  const [otpSentViaEmail, setOtpSentViaEmail] = useState(false);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [otpErrorKey, setOtpErrorKey] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [selectingPlanTier, setSelectingPlanTier] =
    useState<SubscriptionTier | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [stepInputReady, setStepInputReady] = useState(false);
  const [isCompletedTransition, setIsCompletedTransition] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const contactInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStepInputReady(false);
    const delayMs = step === 1 ? 1900 : 1200;
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
    setAccountAlreadyExists(false);
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

  const issueRealOtp = async (cleanContact: string): Promise<boolean> => {
    const otpRes = await requestOtpCodeInSupabase(cleanContact, name.trim());
    if (!otpRes.ok) {
      setError(otpRes.error || "No se pudo generar el código de verificación.");
      return false;
    }
    setOtpSentViaEmail(Boolean(otpRes.sentViaEmail));
    if (otpRes.fallbackCode) {
      setInfoMessage(`Tu código de verificación es: ${otpRes.fallbackCode}`);
    } else {
      setInfoMessage("Código enviado a tu correo electrónico.");
    }
    return true;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const cleanContact = contact.trim();
    const validationError = validateContact(cleanContact);
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
    setAccountAlreadyExists(false);
    setIsBusy(true);

    // 1. Validar en Supabase si la cuenta ya fue creada
    const exists = await checkAccountExistsInSupabase(cleanContact);
    if (exists) {
      setIsBusy(false);
      setAccountAlreadyExists(true);
      setError("Esta cuenta ya fue creada. Inicia sesión con tu contraseña.");
      return;
    }

    // 2. Generar y enviar el código desde el servicio privado de verificación.
    const issued = await issueRealOtp(cleanContact);
    setIsBusy(false);
    if (!issued) return;

    setOtp("");
    setResendCooldown(30);
    setError(null);
    setAccountAlreadyExists(false);
    setStep(3);
  };

  const verifyOtpCode = async (codeToVerify: string) => {
    if (isBusy) return;
    if (codeToVerify.length < 5) {
      setError("Ingresa los 5 dígitos del código.");
      setOtpErrorKey((k) => k + 1);
      return;
    }

    setError(null);
    setIsBusy(true);

    const isValid = await verifyOtpCodeInSupabase(contact.trim(), codeToVerify);

    setIsBusy(false);

    if (!isValid) {
      setError("Código incorrecto o expirado. Verifica e intenta de nuevo.");
      setOtpErrorKey((k) => k + 1);
      return;
    }

    setInfoMessage("Código verificado");
    window.setTimeout(() => {
      goToStep(4);
    }, 300);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyOtpCode(otp);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isBusy) return;
    setError(null);
    setInfoMessage(null);
    setIsBusy(true);

    const issued = await issueRealOtp(contact.trim());
    setIsBusy(false);

    if (issued) {
      setOtp("");
      setResendCooldown(30);
      setInfoMessage("Nuevo código generado");
    }
  };

  const handleFinish = async () => {
    if (!role || isBusy) {
      setError("Selecciona tu rol.");
      return;
    }

    setError(null);
    setAccountAlreadyExists(false);
    setIsBusy(true);

    const result = await signUpWithSupabase({
      name: name.trim(),
      contact: contact.trim(),
      password,
      role,
    });

    if (!result.ok) {
      setIsBusy(false);
      setInfoMessage(null);
      if (result.alreadyExists) {
        setAccountAlreadyExists(true);
      }
      setError(result.error || "No se pudo crear la cuenta.");
      return;
    }

    setIsBusy(false);
    setInfoMessage("Cuenta creada. Elige tu plan o continúa gratis.");
    setStep(5);
  };

  const handleSelectPostSignupPlan = async (tier: SubscriptionTier) => {
    if (selectingPlanTier) return;
    setSelectingPlanTier(tier);
    if (tier !== "free") {
      await upgradeSubscriptionTier(tier);
    }
    setIsCompletedTransition(true);
    setInfoMessage("Abriendo radar…");
    window.setTimeout(() => {
      router.push("/radar");
    }, 450);
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
      transition={{ duration: 0.4 }}
      className={[
        "flex h-full flex-col justify-between transition-colors duration-700",
        isCompletedTransition
          ? "rounded-xl bg-[#F7F7F4] p-6 text-[#13150C]"
          : "text-[#F7F7F4]",
      ].join(" ")}
    >
      {/* Top Bar */}
      <div className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            aria-label="Atrás"
            className="-ml-1 inline-flex items-center gap-1.5 bg-transparent p-1.5 text-sm font-medium text-[#F7F7F4]/75 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            <span>Atrás</span>
          </button>

          <div className="flex flex-1 flex-col">
            <div
              className="h-1.5 w-full overflow-hidden rounded-md bg-white/15"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
            >
              <motion.div
                className="h-full rounded-md bg-[#2B4628]"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <span className="min-w-[40px] text-right text-xs font-medium tabular-nums text-[#F7F7F4]/65">
            {step} / {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Center Stage */}
      <div className="nafe-scroll my-auto overflow-y-auto py-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: NAME */}
          {step === 1 && (
            <motion.form
              key="step-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleNameSubmit}
              noValidate
              className="space-y-5"
            >
              <div className="min-h-[80px]">
                <TextType
                  as="h1"
                  text="Hola... Qué bueno tenerte cerca. Dinos, ¿cuál es tu nombre?"
                  initialDelay={240}
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

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={
                  stepInputReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3.5"
              >
                <input
                  ref={nameInputRef}
                  id="onboarding-name"
                  type="text"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="h-11 w-full rounded-lg bg-[#EFEFEA] px-3.5 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none transition-colors focus:bg-[#FFFFFF]"
                />

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  aria-disabled={!isNameReady}
                  className={[
                    "flex h-11 w-full items-center justify-center rounded-lg px-6 text-sm font-medium text-[#F7F7F4] transition-colors",
                    isNameReady
                      ? "bg-[#2B4628] hover:bg-[#223820]"
                      : "cursor-not-allowed bg-[#2B4628]/40 text-white/75",
                  ].join(" ")}
                >
                  Continuar
                </button>
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
              transition={{ duration: 0.25 }}
              onSubmit={handleContactSubmit}
              noValidate
              className="space-y-5"
            >
              <div className="min-h-[80px]">
                <TextType
                  as="h1"
                  text={`Mucho gusto, ${firstName}. ¿Cuál es tu WhatsApp o correo?`}
                  initialDelay={180}
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

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={
                  stepInputReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <input
                  ref={contactInputRef}
                  id="onboarding-contact"
                  type="text"
                  autoComplete="tel email"
                  placeholder="WhatsApp o correo"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (error) setError(null);
                    if (accountAlreadyExists) setAccountAlreadyExists(false);
                  }}
                  className="h-11 w-full rounded-lg bg-[#EFEFEA] px-3.5 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none transition-colors focus:bg-[#FFFFFF]"
                />

                <div className="relative">
                  <input
                    id="onboarding-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent p-1 text-xs font-medium text-[#6E6D5F] hover:text-[#13150C]"
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>

                {error && <ErrorBanner message={error} />}

                {accountAlreadyExists && (
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-[#EFEFEA] px-4 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#FFFFFF]"
                  >
                    Ir a iniciar sesión
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  aria-disabled={!isContactReady || isBusy}
                  className={[
                    "flex h-11 w-full items-center justify-center rounded-lg px-6 text-sm font-medium text-[#F7F7F4] transition-colors",
                    isContactReady
                      ? "bg-[#2B4628] hover:bg-[#223820]"
                      : "cursor-not-allowed bg-[#2B4628]/40 text-white/75",
                  ].join(" ")}
                >
                  {isBusy ? "Verificando…" : "Enviar código"}
                </button>
              </motion.div>
            </motion.form>
          )}

          {/* STEP 3: REAL 5-DIGIT OTP VERIFIED AGAINST SUPABASE */}
          {step === 3 && (
            <motion.form
              key="step-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleOtpSubmit}
              noValidate
              className="space-y-5"
            >
              <div className="min-h-[80px]">
                <TextType
                  as="h1"
                  text="Ingresa tu código de verificación."
                  initialDelay={180}
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

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={
                  stepInputReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#F7F7F4]/80">
                  <span>{formatContactDisplay(contact)}</span>
                  {otpSentViaEmail ? (
                    <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 font-medium text-[#F4F7F4]">
                      Enviado a tu correo
                    </span>
                  ) : null}
                </div>

                <OtpInput
                  length={5}
                  value={otp}
                  onChange={(nextVal) => {
                    setOtp(nextVal);
                    if (error) setError(null);
                    if (infoMessage) setInfoMessage(null);
                  }}
                  onComplete={(completedCode) => {
                    void verifyOtpCode(completedCode);
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
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-md bg-[#1F3A26] px-3.5 py-2.5 text-xs font-medium text-[#F4F7F4]"
                    >
                      {infoMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isBusy}
                  className="text-xs font-medium text-[#F4F7F4] transition-opacity disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Reenviar en ${resendCooldown}s`
                    : "Reenviar código"}
                </button>

                <button
                  type="submit"
                  disabled={isBusy}
                  aria-disabled={!isOtpReady || isBusy}
                  className={[
                    "flex h-11 w-full items-center justify-center rounded-lg px-6 text-sm font-medium text-[#F7F7F4] transition-colors",
                    isOtpReady
                      ? "bg-[#2B4628] hover:bg-[#223820]"
                      : "cursor-not-allowed bg-[#2B4628]/40 text-white/75",
                  ].join(" ")}
                >
                  {isBusy ? "Verificando…" : "Verificar"}
                </button>
              </motion.div>
            </motion.form>
          )}

          {/* STEP 4: ROLE */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="min-h-[72px]">
                <TextType
                  as="h1"
                  text={`Último paso, ${firstName}. ¿Cuál es tu rol?`}
                  initialDelay={180}
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

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={
                  stepInputReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <div
                  className="grid grid-cols-1 gap-2"
                  role="radiogroup"
                  aria-label="Rol"
                >
                  {ROLE_OPTIONS.map((option) => {
                    const isSelected = role === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setRole(option.id);
                          if (error) setError(null);
                        }}
                        className={[
                          "flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold transition-colors",
                          isSelected
                            ? "bg-[#2B4628] text-[#F7F7F4]"
                            : "bg-[#EFEFEA] text-[#13150C] hover:bg-[#FFFFFF]",
                        ].join(" ")}
                      >
                        <span>{option.title}</span>
                      </button>
                    );
                  })}
                </div>

                {error && <ErrorBanner message={error} />}

                {accountAlreadyExists && (
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-[#EFEFEA] px-4 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#FFFFFF]"
                  >
                    Ir a iniciar sesión
                  </button>
                )}

                {infoMessage && (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md bg-[#1F3A26] px-3.5 py-2.5 text-xs font-medium text-[#F4F7F4]"
                  >
                    {infoMessage}
                  </motion.div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={isBusy}
                    aria-disabled={!role || isBusy}
                    className={[
                      "flex h-11 w-full items-center justify-center rounded-lg px-6 text-sm font-medium text-[#F7F7F4] transition-colors",
                      role
                        ? "bg-[#2B4628] hover:bg-[#223820]"
                        : "cursor-not-allowed bg-[#2B4628]/40 text-white/75",
                    ].join(" ")}
                  >
                    {isBusy ? "Creando cuenta…" : "Continuar"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 5: POST-REGISTRATION PLAN SELECTION */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h1 className="font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-[#F7F7F4]/95 sm:text-3xl">
                  Tu cuenta está lista, {firstName}. ¿Quieres activar un plan?
                </h1>
                <p className="text-xs text-[#F7F7F4]/70">
                  Puedes empezar gratis con Plan Semilla o elegir un plan para
                  desbloquear más puestos, fotos y estadísticas.
                </p>
              </div>

              <div className="space-y-2.5">
                {PLAN_LIST.map((plan) => {
                  const isBusyThis = selectingPlanTier === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className="space-y-2.5 rounded-xl bg-[#F7F7F4] p-3.5 text-[#13150C]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-[#13150C]">
                            {plan.name}
                          </h2>
                          <p className="text-[11px] text-[#6E6D5F]">
                            {plan.shortSubtitle}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-base font-semibold text-[#13150C]">
                            {plan.priceLabel}
                          </span>
                          <span className="block text-[10px] text-[#6E6D5F]">
                            {plan.periodLabel}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-1 rounded-lg bg-[#EFEFEA] p-2.5 text-[11px] text-[#13150C]">
                        {plan.perks.map((perk) => (
                          <li key={perk.label} className="leading-snug">
                            <span className="font-semibold text-[#2B4628]">
                              {perk.label}:
                            </span>{" "}
                            {perk.value}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={selectingPlanTier !== null}
                        onClick={() => handleSelectPostSignupPlan(plan.id)}
                        className={[
                          "flex h-10 w-full items-center justify-center rounded-lg px-4 text-xs font-semibold transition-colors disabled:opacity-60",
                          plan.id === "free"
                            ? "bg-[#EFEFEA] text-[#13150C] hover:bg-[#e5e5de]"
                            : "bg-[#2B4628] text-[#F7F7F4] hover:bg-[#223820]",
                        ].join(" ")}
                      >
                        {isBusyThis
                          ? "Activando…"
                          : plan.id === "free"
                            ? "Continuar con Plan Semilla ($0)"
                            : `Elegir ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Switch Link */}
      <div className="flex items-center justify-center pt-3">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm text-[#F7F7F4]/75 transition-colors hover:text-white"
        >
          ¿Ya tienes cuenta?{" "}
          <span className="ml-1.5 font-medium text-[#F4F7F4] underline underline-offset-4">
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
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-md bg-[#F2DCDC] px-3.5 py-2.5 text-xs font-medium text-[#7A2727]"
    >
      {message}
    </motion.div>
  );
}
