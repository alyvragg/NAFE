"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bookmark, ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  ProducerPost,
  BusinessReview,
  fetchBusinessReviews,
  submitBusinessReview,
} from "@/lib/businesses";
import {
  PublicBusinessSale,
  getPublicBusinessSales,
  formatRelativeSaleDate,
} from "@/lib/sales";
import { openExternalUrl } from "@/lib/nativeBridge";
import { getShortCategoryLabel } from "./BuyerRadarView";

interface ProducerDetailSheetProps {
  producer: ProducerPost | null;
  reviewerName: string;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenSellerProfile?: (producerName: string) => void;
  onOpenChat?: (producer: ProducerPost) => void;
  onReviewSubmitted?: (businessId: string, newRating: number) => void;
}

type DetailTab = "info" | "sales" | "reviews";

export function ProducerDetailSheet({
  producer,
  reviewerName,
  onClose,
  isSaved,
  onToggleSave,
  onOpenSellerProfile,
  onOpenChat,
  onReviewSubmitted,
}: ProducerDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("info");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [publicSales, setPublicSales] = useState<PublicBusinessSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!producer) return;
    setActiveTab("info");
    fetchBusinessReviews(producer.id).then(setReviews);
    setLoadingSales(true);
    getPublicBusinessSales(producer.id, 15)
      .then(setPublicSales)
      .finally(() => setLoadingSales(false));
  }, [producer]);

  const handleWhatsAppContact = (item: ProducerPost) => {
    const message = encodeURIComponent(
      `Hola ${item.producerName}, vi tu publicación de "${item.productTitle}" en NAFE (a ${item.distanceKm} km). ¿Tienes disponible hoy en ${item.meetingPoint}?`
    );
    openExternalUrl(`https://wa.me/${item.whatsappContact}?text=${message}`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer || submittingReview) return;
    setSubmittingReview(true);

    const created = await submitBusinessReview({
      businessId: producer.id,
      reviewerName: reviewerName || "Vecino",
      rating: ratingInput,
      comment: commentInput,
    });

    if (created) {
      setReviews((prev) => [created, ...prev]);
      setCommentInput("");
      if (onReviewSubmitted) {
        onReviewSubmitted(producer.id, ratingInput);
      }
    }
    setSubmittingReview(false);
  };

  const photos =
    producer?.photos && producer.photos.length > 0 ? producer.photos : [];

  const totalSalesCount = Math.max(
    producer?.completedSalesCount || 0,
    publicSales.length
  );
  const verifiedSalesCount = Math.max(
    producer?.verifiedSalesCount || 0,
    publicSales.filter((s) => s.buyerConfirmed).length
  );

  return (
    <AnimatePresence
      onExitComplete={() => {
        setPhotoIdx(0);
        setCommentInput("");
        setActiveTab("info");
      }}
    >
      {producer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="producer-detail-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#13150C]/45 backdrop-blur-xs"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[500px] flex-col overflow-hidden rounded-t-xl bg-[#F7F7F4] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(19,21,12,0.22)] sm:rounded-xl"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
                    producer.freshnessStatus === "confirmed"
                      ? "bg-[#1F3A26] text-[#F4F7F4]"
                      : "bg-[#F2DCDC] text-[#7A2727]",
                  ].join(" ")}
                >
                  {producer.freshnessLabel}
                </span>

                <span className="inline-flex items-center gap-1 text-xs text-[#6E6D5F]">
                  <Star
                    className="h-3.5 w-3.5 text-[#C88A1E]"
                    fill="currentColor"
                    strokeWidth={1.6}
                  />
                  <span>
                    {producer.avgRating.toFixed(1)} ({producer.reviewsCount})
                    {totalSalesCount > 0
                      ? ` · ${totalSalesCount} ${
                          totalSalesCount === 1 ? "entrega" : "entregas"
                        }`
                      : ""}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleSave(producer.id)}
                  aria-label={
                    isSaved ? "Quitar de guardados" : "Guardar en favoritos"
                  }
                  className={[
                    "bg-transparent p-1.5 transition-colors",
                    isSaved
                      ? "text-[#1F3A26]"
                      : "text-[#13150C]/55 hover:text-[#13150C]",
                  ].join(" ")}
                >
                  <Bookmark
                    className="h-4 w-4"
                    strokeWidth={1.6}
                    fill={isSaved ? "currentColor" : "none"}
                  />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar detalle"
                  className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            {/* Pestañas limpias sin bordes: Información | Ventas | Reseñas */}
            <div
              role="tablist"
              aria-label="Secciones del negocio"
              className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-[#EFEFEA] p-1"
            >
              {(
                [
                  { id: "info" as const, label: "Información" },
                  {
                    id: "sales" as const,
                    label: `Ventas (${totalSalesCount})`,
                  },
                  {
                    id: "reviews" as const,
                    label: `Reseñas (${Math.max(producer.reviewsCount, reviews.length)})`,
                  },
                ]
              ).map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "h-8 rounded-md px-2 text-xs font-semibold transition-all",
                      selected
                        ? "bg-[#2B4628] text-[#F7F7F4]"
                        : "text-[#6E6D5F] hover:text-[#13150C]",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Body */}
            <div className="nafe-scroll flex-1 space-y-3.5 overflow-y-auto py-1">
              {activeTab === "info" && (
                <>
                  {photos.length > 0 ? (
                    <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[#EFEFEA]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos[photoIdx % photos.length]}
                        alt={producer.productTitle}
                        className="h-full w-full object-cover"
                      />
                      {photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoIdx(
                                (prev) =>
                                  (prev - 1 + photos.length) % photos.length
                              )
                            }
                            aria-label="Foto anterior"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-transparent p-1.5 text-white/85 hover:text-white"
                          >
                            <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoIdx((prev) => (prev + 1) % photos.length)
                            }
                            aria-label="Siguiente foto"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent p-1.5 text-white/85 hover:text-white"
                          >
                            <ChevronRight
                              className="h-4 w-4"
                              strokeWidth={1.6}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-[#EFEFEA] px-4 py-3">
                      <span className="text-xs font-medium text-[#6E6D5F]">
                        {getShortCategoryLabel(producer.category)}
                      </span>
                      <span className="text-xs font-medium text-[#6E6D5F]">
                        {producer.distanceKm} km
                      </span>
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenSellerProfile) {
                          onClose();
                          onOpenSellerProfile(producer.producerName);
                        }
                      }}
                      className="inline-block text-xs font-semibold text-[#2B4628] hover:underline"
                    >
                      {producer.producerName}
                    </button>

                    <h2
                      id="producer-detail-title"
                      className="mt-1 text-lg font-semibold tracking-tight text-[#13150C]"
                    >
                      {producer.productTitle}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#6E6D5F]">
                      {producer.story}
                    </p>
                  </div>

                  {/* Punto de encuentro y horario (Sin cajas de íconos) */}
                  <div className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                    <div>
                      <span className="block text-xs text-[#6E6D5F]">
                        Punto de encuentro ({producer.distanceKm} km)
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-[#13150C]">
                        {producer.meetingPoint}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-[#6E6D5F]">
                        Horario
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-[#13150C]">
                        {producer.scheduleToday}
                      </span>
                    </div>
                  </div>

                  {/* Vista previa compacta de Historial de ventas */}
                  <div className="space-y-2 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#13150C]">
                        Historial de ventas
                      </h3>

                      {verifiedSalesCount > 0 && (
                        <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                          {verifiedSalesCount} confirmadas
                        </span>
                      )}
                    </div>

                    {publicSales.length === 0 ? (
                      <p className="text-xs text-[#6E6D5F]">
                        Aún sin ventas registradas
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {publicSales.slice(0, 2).map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs"
                          >
                            <span className="truncate font-medium text-[#13150C]">
                              {sale.itemSummary}
                              {sale.quantity > 1 ? ` (×${sale.quantity})` : ""}
                            </span>
                            <span
                              className={[
                                "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                                sale.buyerConfirmed
                                  ? "bg-[#1F3A26] text-[#F4F7F4]"
                                  : "bg-[#FFFFFF] text-[#13150C]",
                              ].join(" ")}
                            >
                              {sale.buyerConfirmed
                                ? "Confirmada"
                                : "Registrada"}
                            </span>
                          </div>
                        ))}

                        {publicSales.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("sales")}
                            className="pt-1 text-xs font-semibold text-[#2B4628] hover:underline"
                          >
                            Ver todas ({totalSalesCount})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "sales" && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                    <h3 className="text-sm font-semibold text-[#13150C]">
                      Historial de ventas ({totalSalesCount})
                    </h3>

                    <span className="rounded-md bg-[#1F3A26] px-2.5 py-0.5 text-xs font-medium text-[#F4F7F4]">
                      {verifiedSalesCount} confirmadas
                    </span>
                  </div>

                  {loadingSales ? (
                    <div className="rounded-xl bg-[#FFFFFF] p-5 text-center text-xs text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                      Cargando…
                    </div>
                  ) : publicSales.length === 0 ? (
                    <div className="rounded-xl bg-[#FFFFFF] p-5 text-center text-sm text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
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
              )}

              {activeTab === "reviews" && (
                <div className="space-y-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                  <h3 className="text-sm font-semibold text-[#13150C]">
                    Calificar
                  </h3>

                  <form onSubmit={handleReviewSubmit} className="space-y-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingInput(star)}
                          aria-label={`${star} estrellas`}
                          className="bg-transparent p-1.5 transition-transform active:scale-95"
                        >
                          <Star
                            className="h-4 w-4 text-[#C88A1E]"
                            strokeWidth={1.6}
                            fill={star <= ratingInput ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                      <span className="ml-1 text-xs text-[#6E6D5F]">
                        {ratingInput} / 5
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Escribe una reseña"
                        className="h-10 flex-1 rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="h-10 rounded-lg bg-[#2B4628] px-3.5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
                      >
                        {submittingReview ? "…" : "Calificar"}
                      </button>
                    </div>
                  </form>

                  {reviews.length === 0 ? (
                    <p className="pt-1 text-xs text-[#6E6D5F]">Sin reseñas</p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#13150C]">
                              {rev.reviewerName}
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-[#C88A1E]">
                              ★ {rev.rating}
                            </span>
                          </div>
                          {rev.comment && (
                            <p className="mt-0.5 text-[#6E6D5F]">
                              {rev.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions (Solo texto limpio) */}
            <div className="grid grid-cols-2 gap-2.5 pt-3.5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenChat) {
                    onClose();
                    onOpenChat(producer);
                  }
                }}
                className="flex h-11 items-center justify-center rounded-lg bg-[#EFEFEA] px-4 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#FFFFFF]"
              >
                Enviar mensaje
              </button>

              <button
                type="button"
                onClick={() => handleWhatsAppContact(producer)}
                className="flex h-11 items-center justify-center rounded-lg bg-[#2B4628] px-4 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
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
