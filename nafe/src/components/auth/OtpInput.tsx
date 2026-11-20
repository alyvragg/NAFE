"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  errorKey?: number;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}

export function OtpInput({
  length = 5,
  value,
  onChange,
  hasError = false,
  errorKey = 0,
  disabled = false,
  onComplete,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    const targetIndex = firstEmpty === -1 ? length - 1 : firstEmpty;
    const timer = window.setTimeout(() => {
      inputsRef.current[targetIndex]?.focus();
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAtIndex = (index: number, rawInput: string) => {
    const cleaned = rawInput.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && index + i < length; i++) {
        next[index + i] = cleaned[i];
      }
      const joined = next.join("").slice(0, length);
      onChange(joined);
      const focusIdx = Math.min(index + cleaned.length, length - 1);
      inputsRef.current[focusIdx]?.focus();
      if (joined.length === length && onComplete) {
        onComplete(joined);
      }
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    const joined = next.join("");
    onChange(joined);

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    if (joined.length === length && onComplete) {
      onComplete(joined);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    const clipped = pasted.slice(0, length);
    onChange(clipped);
    const focusIdx = Math.min(clipped.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
    if (clipped.length === length && onComplete) {
      onComplete(clipped);
    }
  };

  return (
    <motion.div
      key={hasError ? `otp-error-${errorKey}` : "otp-normal"}
      animate={hasError ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.42, ease: "easeInOut" }}
      className="flex w-full items-center justify-between gap-2.5 sm:gap-3"
      role="group"
      aria-label={`Código de verificación de ${length} dígitos`}
    >
      {digits.map((digit, index) => {
        const isFilled = digit !== "";
        return (
          <motion.div
            key={index}
            animate={{ scale: isFilled ? [1, 1.04, 1] : 1 }}
            transition={{ duration: 0.18 }}
            className="flex-1"
          >
            <input
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={length}
              disabled={disabled}
              value={digit}
              aria-label={`Dígito ${index + 1} de ${length}`}
              aria-invalid={hasError}
              onChange={(e) => updateAtIndex(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.currentTarget.select()}
              className={[
                "h-[58px] min-h-[54px] w-full min-w-[46px] rounded-lg border-2 text-center font-sans text-2xl font-semibold text-[#13150C] outline-none transition-all duration-200",
                "focus:ring-4 focus:ring-[#3D562F]/15",
                hasError
                  ? "border-[#9E4242]/60 bg-[#F7DBDB] text-[#13150C]"
                  : isFilled
                    ? "border-[#3D562F] bg-[#DBF7EC] text-[#13150C] shadow-[0_2px_10px_rgba(61,86,47,0.1)]"
                    : "border-[#3D562F]/50 bg-white/80 focus:border-[#3D562F] focus:bg-white",
                disabled ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
