"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SubscriptionTier, LocalProfile } from "@/components/auth/validators";
import { upgradeSubscriptionTier } from "@/lib/supabase";
import { PLAN_LIST } from "@/lib/plans";

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
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-xl bg-[#F7F7F4] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_rgba(19,21,12,0.22)] sm:rounded-xl"
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h2
                  id="subscription-modal-title"
                  className="font-serif text-xl font-medium tracking-tight text-[#13150C]/85"
                >
                  Planes NAFE
                </h2>
                <p className="text-xs text-[#6E6D5F]">
                  Elige el nivel de visibilidad y herramientas para tu puesto
                </p>
              </div>

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
              {PLAN_LIST.map((plan) => {
                const isCurrent = currentTier === plan.id;
                const isHighlighted = plan.id === "coop";

                return (
                  <div
                    key={plan.id}
                    className="space-y-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[15px] font-semibold text-[#13150C]">
                            {plan.name}
                          </h3>
                          {isCurrent && (
                            <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-[11px] font-medium text-[#F4F7F4]">
                              Plan actual
                            </span>
                          )}
                          {!isCurrent && isHighlighted && (
                            <span className="rounded-md bg-[#EFEFEA] px-2 py-0.5 text-[11px] font-medium text-[#2B4628]">
                              Más completo
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#6E6D5F]">
                          {plan.shortSubtitle}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-lg font-semibold text-[#13150C]">
                          {plan.priceLabel}
                        </span>
                        <span className="block text-[11px] text-[#6E6D5F]">
                          {plan.periodLabel}
                        </span>
                      </div>
                    </div>

                    {/* Lista completa de beneficios (perks) */}
                    <dl className="space-y-1.5 rounded-lg bg-[#F7F7F4] p-3 text-xs">
                      {plan.perks.map((perk) => (
                        <div
                          key={perk.label}
                          className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
                        >
                          <dt className="shrink-0 font-medium text-[#6E6D5F]">
                            {perk.label}
                          </dt>
                          <dd className="font-medium text-[#13150C] sm:text-right">
                            {perk.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <button
                      type="button"
                      disabled={busyTier !== null || isCurrent}
                      onClick={() => handleSelectTier(plan.id)}
                      className={[
                        "flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60",
                        plan.id === "free"
                          ? "bg-[#EFEFEA] text-[#13150C] hover:bg-[#e5e5de]"
                          : "bg-[#2B4628] text-[#F7F7F4] hover:bg-[#223820]",
                      ].join(" ")}
                    >
                      {isCurrent
                        ? "Plan actual"
                        : busyTier === plan.id
                          ? "Activando…"
                          : plan.id === "free"
                            ? "Cambiar a Plan Semilla"
                            : `Activar ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
