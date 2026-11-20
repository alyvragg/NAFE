"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star } from "lucide-react";
import { ProducerPost } from "@/lib/businesses";
import {
  PublicBusinessSale,
  getPublicBusinessSales,
  formatRelativeSaleDate,
} from "@/lib/sales";
import { openExternalUrl } from "@/lib/nativeBridge";
import { getShortCategoryLabel } from "./BuyerRadarView";

interface SellerProfileSheetProps {
  producerName: string | null;
  allProducers: ProducerPost[];
  onClose: () => void;
  onSelectPost: (post: ProducerPost) => void;
}

export function SellerProfileSheet({
  producerName,
  allProducers,
  onClose,
  onSelectPost,
}: SellerProfileSheetProps) {
  const [publicSales, setPublicSales] = useState<PublicBusinessSale[]>([]);

  const sellerPosts = producerName
    ? allProducers.filter((p) => p.producerName === producerName)
    : [];

  const primaryPost = sellerPosts[0] ?? null;

  useEffect(() => {
    if (!primaryPost) {
      setPublicSales([]);
      return;
    }
    getPublicBusinessSales(primaryPost.id, 15).then(setPublicSales);
  }, [primaryPost]);

  const totalCompletedSales = sellerPosts.reduce(
    (acc, post) => acc + (post.completedSalesCount || 0),
    0
  );
  const totalVerifiedSales = sellerPosts.reduce(
    (acc, post) => acc + (post.verifiedSalesCount || 0),
    0
  );
  const effectiveSalesCount = Math.max(totalCompletedSales, publicSales.length);
  const effectiveVerifiedCount = Math.max(
    totalVerifiedSales,
    publicSales.filter((s) => s.buyerConfirmed).length
  );

  const handleDirectWhatsApp = () => {
    if (!primaryPost) return;
    const msg = encodeURIComponent(
      `Hola ${primaryPost.producerName}, vi tu perfil de productor en NAFE. Me interesa conocer lo que tienes disponible hoy.`
    );
    openExternalUrl(`https://wa.me/${primaryPost.whatsappContact}?text=${msg}`);
  };

  return (
    <AnimatePresence>
      {producerName && primaryPost && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-profile-title"
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
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[500px] flex-col overflow-hidden rounded-t-xl bg-[#F7F7F4] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(19,21,12,0.25)] sm:rounded-xl"
          >
            {/* Header Limpio */}
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                  Verificado
                </span>
                <h2
                  id="seller-profile-title"
                  className="mt-1.5 truncate text-lg font-semibold tracking-tight text-[#13150C]"
                >
                  {primaryPost.producerName}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar perfil"
                className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>

            {/* Body */}
            <div className="nafe-scroll flex-1 space-y-3.5 overflow-y-auto py-1">
              <div className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[#2B4628]">
                    {getShortCategoryLabel(primaryPost.category)}
                  </span>
                  <div className="flex items-center gap-2 text-[#6E6D5F]">
                    <span className="inline-flex items-center gap-1">
                      <Star
                        className="h-3.5 w-3.5 text-[#C88A1E]"
                        fill="currentColor"
                        strokeWidth={1.6}
                      />
                      {primaryPost.avgRating.toFixed(1)} (
                      {primaryPost.reviewsCount})
                    </span>

                    {effectiveSalesCount > 0 && (
                      <span>
                        · {effectiveSalesCount}{" "}
                        {effectiveSalesCount === 1 ? "entrega" : "entregas"}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-[#6E6D5F]">
                  {primaryPost.story}
                </p>

                <div className="space-y-0.5 rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs text-[#6E6D5F]">
                  <p className="font-medium text-[#13150C]">
                    {primaryPost.meetingPoint} ({primaryPost.distanceKm} km)
                  </p>
                  <p>{primaryPost.scheduleToday}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#13150C]">
                  Publicaciones ({sellerPosts.length})
                </h3>

                <div className="space-y-2">
                  {sellerPosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectPost(post);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-3.5 text-left shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-colors hover:bg-[#EFEFEA]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#13150C]">
                          {post.productTitle}
                        </p>
                      </div>
                      <span
                        className={[
                          "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                          post.freshnessStatus === "confirmed"
                            ? "bg-[#1F3A26] text-[#F4F7F4]"
                            : "bg-[#F2DCDC] text-[#7A2727]",
                        ].join(" ")}
                      >
                        {post.freshnessLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Historial Público de Ventas */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#13150C]">
                    Historial de ventas ({effectiveSalesCount})
                  </h3>

                  {effectiveVerifiedCount > 0 && (
                    <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                      {effectiveVerifiedCount} confirmadas
                    </span>
                  )}
                </div>

                {publicSales.length === 0 ? (
                  <div className="rounded-xl bg-[#FFFFFF] p-4 text-center text-xs text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                    Aún sin ventas registradas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publicSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#FFFFFF] p-3.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-[#13150C]">
                            {sale.itemSummary}
                            {sale.quantity > 1 ? ` (×${sale.quantity})` : ""}
                          </p>
                          <span className="text-xs text-[#6E6D5F]">
                            {formatRelativeSaleDate(sale.createdAt)}
                          </span>
                        </div>

                        <span
                          className={[
                            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                            sale.buyerConfirmed
                              ? "bg-[#1F3A26] text-[#F4F7F4]"
                              : "bg-[#EFEFEA] text-[#13150C]",
                          ].join(" ")}
                        >
                          {sale.buyerConfirmed ? "Confirmada" : "Registrada"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3.5">
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
              >
                WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
