"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SubscriptionTier, LocalProfile } from "@/components/auth/validators";
import { upgradeSubscriptionTier } from "@/lib/supabase";

interface SubscriptionModalProps {
  isOpen: boolean;
  currentTier: SubscriptionTier;
  onClose: () => void;
  onUpgraded: (updatedProfile: LocalProfile) => void;
}

export function SubscriptionModal({
  isOpen,
  currentTier,
  onClose,
  onUpgraded,
}: SubscriptionModalProps) {
  const [busyTier, setBusyTier] = useState<SubscriptionTier | null>(null);

  const handleSelectTier = async (tier: SubscriptionTier) => {
    setBusyTier(tier);
    const updated = await upgradeSubscriptionTier(tier);
    setBusyTier(null);
    onUpgraded(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#13150C]/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-xl bg-[#F7F7F4] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_rgba(19,21,12,0.22)] sm:rounded-xl"
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <h2
                id="subscription-modal-title"
                className="text-lg font-semibold tracking-tight text-[#13150C]"
              >
                Planes
              </h2>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>

            <div className="nafe-scroll flex-1 space-y-3 overflow-y-auto py-1">
              {/* Plan Cosecha ($99 MXN/mes) */}
              <div className="space-y-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-[#13150C]">
                      Plan Cosecha
                    </h3>
                    <span className="text-xs text-[#6E6D5F]">
                      Hasta 5 negocios activos
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-[#13150C]">
                      $99
                    </span>
                    <span className="block text-xs text-[#6E6D5F]">
                      MXN / mes
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyTier !== null || currentTier === "pro"}
                  onClick={() => handleSelectTier("pro")}
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-[#2B4628] px-4 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820] disabled:opacity-60"
                >
                  {currentTier === "pro"
                    ? "Plan actual"
                    : busyTier === "pro"
                      ? "Activando…"
                      : "Activar Plan Cosecha"}
                </button>
              </div>

              {/* Plan Cooperativa ($249 MXN/mes) */}
              <div className="space-y-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-[#13150C]">
                      Plan Cooperativa
                    </h3>
                    <span className="text-xs text-[#6E6D5F]">
                      Negocios ilimitados
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-[#13150C]">
                      $249
                    </span>
                    <span className="block text-xs text-[#6E6D5F]">
                      MXN / mes
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyTier !== null || currentTier === "coop"}
                  onClick={() => handleSelectTier("coop")}
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-[#1F3A26] px-4 text-sm font-medium text-[#F4F7F4] transition-colors hover:bg-[#223820] disabled:opacity-60"
                >
                  {currentTier === "coop"
                    ? "Plan actual"
                    : busyTier === "coop"
                      ? "Activando…"
                      : "Activar Plan Cooperativa"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
