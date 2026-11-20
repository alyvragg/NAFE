"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  MessageCircle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";
import { ProducerPost } from "@/data/mockProducers";
import { openExternalUrl } from "@/lib/nativeBridge";
import { getSectionIcon } from "./BuyerRadarView";

interface ProducerDetailSheetProps {
  producer: ProducerPost | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenSellerProfile?: (producerName: string) => void;
}

export function ProducerDetailSheet({
  producer,
  onClose,
  isSaved,
  onToggleSave,
  onOpenSellerProfile,
}: ProducerDetailSheetProps) {
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  const handleWhatsAppContact = (item: ProducerPost) => {
    setContactConfirmed(true);
    const message = encodeURIComponent(
      `Hola ${item.producerName}, vi tu publicación de "${item.productTitle}" en el radar NAFE (a ${item.distanceKm} km). ¿Aún tienes disponible hoy en ${item.meetingPoint}?`
    );
    openExternalUrl(`https://wa.me/${item.whatsappContact}?text=${message}`);
  };

  const photos =
    producer?.photos && producer.photos.length > 0
      ? producer.photos
      : [
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
        ];

  return (
    <AnimatePresence
      onExitComplete={() => {
        setContactConfirmed(false);
        setPhotoIdx(0);
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
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#13150C]/45 backdrop-blur-xs"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[500px] flex-col overflow-hidden rounded-t-xl border-t border-white/40 bg-[#DEDED8] px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(19,21,12,0.28)] sm:rounded-xl"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-[12px] font-semibold text-[#13150C]",
                  producer.freshnessStatus === "confirmed"
                    ? "border-[#3D562F]/30 bg-[#DBF7EC]"
                    : "border-[#9E4242]/25 bg-[#F7DBDB]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-xs",
                    producer.freshnessStatus === "confirmed"
                      ? "bg-[#3D562F]"
                      : "bg-[#9E4242]",
                  ].join(" ")}
                />
                {producer.freshnessLabel}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSave(producer.id)}
                  aria-label={
                    isSaved ? "Quitar de guardados" : "Guardar en favoritos"
                  }
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                    isSaved
                      ? "border-[#3D562F] bg-[#DBF7EC] text-[#3D562F]"
                      : "border-[#949172]/40 bg-white/75 text-[#13150C]",
                  ].join(" ")}
                >
                  <Bookmark
                    className="h-4 w-4"
                    fill={isSaved ? "currentColor" : "none"}
                  />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar detalle"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#949172]/40 bg-white/75 text-[#13150C] transition-colors hover:bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="nafe-scroll flex-1 space-y-4 overflow-y-auto py-1">
              {/* Photo Carousel Gallery */}
              <div className="relative h-52 w-full overflow-hidden rounded-xl border border-[#949172]/35 bg-[#13150C]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[photoIdx % photos.length]}
                  alt={producer.productTitle}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13150C]/70 via-transparent to-transparent" />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIdx(
                          (prev) => (prev - 1 + photos.length) % photos.length
                        )
                      }
                      aria-label="Foto anterior"
                      className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#13150C]/65 text-white hover:bg-[#13150C]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIdx((prev) => (prev + 1) % photos.length)
                      }
                      aria-label="Siguiente foto"
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#13150C]/65 text-white hover:bg-[#13150C]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[12px] font-semibold text-white">
                  {(() => {
                    const CategoryIcon = getSectionIcon(producer.category);
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#3D562F] px-2.5 py-1 text-[#DEDED8]">
                        <CategoryIcon className="h-3.5 w-3.5" />
                        <span>{producer.category}</span>
                      </span>
                    );
                  })()}
                  <span className="rounded-md bg-[#13150C]/75 px-2.5 py-1">
                    A {producer.distanceKm} km de ti
                  </span>
                </div>
              </div>

              {/* Title & Clickable Seller Profile Link */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSellerProfile) {
                        onClose();
                        onOpenSellerProfile(producer.producerName);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#3D562F]/10 px-2.5 py-1 text-[12.5px] font-semibold text-[#3D562F] transition-colors hover:bg-[#3D562F] hover:text-white"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>{producer.producerName} · Ver perfil</span>
                  </button>

                  <span className="rounded-md bg-[#949172]/15 px-2 py-0.5 text-[11.5px] font-semibold text-[#13150C]/75">
                    {producer.savingsTag}
                  </span>
                </div>

                <h2
                  id="producer-detail-title"
                  className="mt-2 font-serif text-[25px] font-medium leading-[1.16] text-[#13150C]/80"
                >
                  {producer.productTitle}
                </h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#13150C]/75">
                  {producer.story}
                </p>
              </div>

              {/* Safe Meeting Point & Schedule */}
              <div className="space-y-2.5 rounded-xl border border-[#949172]/40 bg-white/75 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DBF7EC] text-[#3D562F]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-[#949172]">
                      Punto de encuentro público ({producer.distanceKm} km)
                    </span>
                    <span className="mt-0.5 block text-[14px] font-semibold text-[#13150C]">
                      {producer.meetingPoint}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-[#949172]/25" />

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DEDED8] text-[#3D562F]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-[#949172]">
                      Horario confirmado de hoy
                    </span>
                    <span className="mt-0.5 block text-[14px] font-medium text-[#13150C]">
                      {producer.scheduleToday}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-2.5 rounded-md border border-[#3D562F]/20 bg-[#DBF7EC]/80 px-3.5 py-3 text-[12.5px] leading-snug text-[#13150C]/85">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3D562F]" />
                <span>
                  <strong>Punto público seguro:</strong> Nunca mostramos
                  direcciones privadas de parcelas o casas. Acuerda la entrega
                  directamente con el productor.
                </span>
              </div>

              {contactConfirmed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 rounded-md border border-[#3D562F]/35 bg-[#DBF7EC] px-4 py-3 text-[13px] font-medium text-[#13150C]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3D562F]" />
                  <span>
                    Abriendo chat directo con {producer.producerName}…
                  </span>
                </motion.div>
              )}
            </div>

            {/* Primary WhatsApp Direct Contact Action */}
            <div className="pt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => handleWhatsAppContact(producer)}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-lg bg-[#3D562F] px-6 text-[15.5px] font-semibold text-[#FFFFFF] shadow-[0_8px_20px_rgba(61,86,47,0.25)] transition-colors hover:bg-[#334827] active:bg-[#2B3E21]"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Contactar por WhatsApp</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
