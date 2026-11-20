"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  MessageCircle,
  Store,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ProducerPost } from "@/data/mockProducers";
import { openExternalUrl } from "@/lib/nativeBridge";

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
  const sellerPosts = producerName
    ? allProducers.filter((p) => p.producerName === producerName)
    : [];

  const primaryPost = sellerPosts[0] ?? null;

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
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#13150C]/50 backdrop-blur-xs"
          />

          {/* Seller Profile Drawer */}
          <motion.div
            initial={{ y: "100%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-xl border-t border-white/40 bg-[#DEDED8] shadow-[0_-18px_50px_rgba(19,21,12,0.28)] sm:rounded-xl"
          >
            {/* Cover Banner */}
            <div className="relative h-36 w-full shrink-0 bg-[#3D562F]">
              {primaryPost.photos?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryPost.photos[0]}
                  alt={primaryPost.producerName}
                  className="h-full w-full object-cover opacity-55"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#13150C]/85 via-[#13150C]/35 to-transparent" />

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar perfil del vendedor"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#13150C]/65 text-white transition-colors hover:bg-[#13150C]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute inset-x-5 bottom-4 flex items-end gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#DEDED8] bg-[#3D562F] text-[#DBF7EC] shadow-md">
                  <Store className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#DBF7EC] px-2 py-0.5 text-[11px] font-semibold text-[#3D562F]">
                    <ShieldCheck className="h-3 w-3" />
                    Productor local verificado
                  </span>
                  <h2
                    id="seller-profile-title"
                    className="mt-1 truncate font-serif text-[23px] font-medium leading-tight text-[#DEDED8]/95"
                  >
                    {primaryPost.producerName}
                  </h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="nafe-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Bio & Trust Info */}
              <div className="rounded-xl border border-[#949172]/40 bg-white/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-[#3D562F]">
                    {primaryPost.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#949172]/15 px-2 py-0.5 font-semibold text-[#13150C]/80">
                    <Sparkles className="h-3 w-3 text-[#3D562F]" />
                    {primaryPost.savingsTag}
                  </span>
                </div>

                <p className="text-[14px] leading-relaxed text-[#13150C]/80">
                  {primaryPost.story}
                </p>

                <div className="space-y-1.5 border-t border-[#949172]/25 pt-2.5 text-[12.5px] text-[#13150C]/80">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3D562F]" />
                    <span>
                      Punto habitual: {primaryPost.meetingPoint} (a{" "}
                      {primaryPost.distanceKm} km)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#13150C]/65">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[#949172]" />
                    <span>{primaryPost.scheduleToday}</span>
                  </div>
                </div>
              </div>

              {/* Active Listings by this Seller */}
              <div className="space-y-2.5">
                <h3 className="font-serif text-[19px] font-medium text-[#13150C]/80">
                  Disponible hoy en este puesto ({sellerPosts.length})
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
                      className="flex w-full items-center gap-3 rounded-xl border border-[#949172]/35 bg-white/80 p-3 text-left transition-colors hover:border-[#3D562F] hover:bg-white"
                    >
                      {post.photos?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.photos[0]}
                          alt={post.productTitle}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className={[
                            "inline-block rounded-md px-2 py-0.5 text-[10.5px] font-semibold text-[#13150C]",
                            post.freshnessStatus === "confirmed"
                              ? "bg-[#DBF7EC]"
                              : "bg-[#F7DBDB]",
                          ].join(" ")}
                        >
                          {post.freshnessLabel}
                        </span>
                        <p className="mt-1 truncate text-[14px] font-semibold text-[#13150C]">
                          {post.productTitle}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#3D562F]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer WhatsApp Action */}
            <div className="shrink-0 border-t border-[#949172]/25 bg-[#DEDED8] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#3D562F] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#334827]"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Contactar a este puesto por WhatsApp</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
