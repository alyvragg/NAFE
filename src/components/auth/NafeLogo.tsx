"use client";

import React from "react";

interface NafeLogoProps {
  variant?: "hero" | "compact";
  className?: string;
}

/**
 * Official NAFE logo rendered from /logo.svg in public/
 */
export function NafeLogo({ variant = "hero", className = "" }: NafeLogoProps) {
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="NAFE"
          className="h-9 w-auto object-contain"
        />
        <span className="font-serif text-xl font-medium tracking-[0.18em] text-[#13150C]/80">
          NAFE
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center gap-2.5 select-none ${className}`}
      aria-label="NAFE"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="NAFE"
        className="h-12 w-auto object-contain drop-shadow-[0_2px_10px_rgba(19,21,12,0.35)]"
      />
      <span className="font-serif text-[26px] font-medium leading-none tracking-[0.24em] text-[#DEDED8]/90 drop-shadow-[0_2px_10px_rgba(19,21,12,0.3)]">
        NAFE
      </span>
    </div>
  );
}
