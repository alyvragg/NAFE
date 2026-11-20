"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Clock,
  PauseCircle,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Eye,
  MessageCircle,
  MapPin,
  Sprout,
  X,
  ImagePlus,
  Loader2,
  Store,
  RefreshCw,
  Trash2,
  Edit3,
  Play,
} from "lucide-react";
import { LocalProfile } from "@/components/auth/validators";
import {
  ProducerCategory,
  ProducerPost,
  createNewHarvestPost,
  uploadProducerPhotoToSupabase,
  renewProducerPost24h,
  toggleProducerPostStatus,
  deleteProducerPost,
} from "@/data/mockProducers";
import { updateProfileInSupabase } from "@/lib/supabase";
import { GeoCoordinates } from "@/lib/nativeBridge";

interface ProducerPanelViewProps {
  profile: LocalProfile;
  userCoords: GeoCoordinates;
  isOffline: boolean;
  myPosts: ProducerPost[];
  onPostCreated: (newPost: ProducerPost) => void;
  onPostUpdated: (postId: string, patch: Partial<ProducerPost>) => void;
  onPostDeleted: (postId: string) => void;
  onProfileUpdated: (next: LocalProfile) => void;
}

const CATEGORIES: Array<Exclude<ProducerCategory, "Todo">> = [
  "Comida y Gastronomía",
  "Plantas y Viveros",
  "Minería y Cantera",
  "Campo y Huerta",
  "Artesanía y Talleres",
  "Textiles y Moda Local",
  "Servicios y Oficios",
];

export function ProducerPanelView({
  profile,
  userCoords,
  isOffline,
  myPosts,
  onPostCreated,
  onPostUpdated,
  onPostDeleted,
  onProfileUpdated,
}: ProducerPanelViewProps) {
  const [isAvailableToday, setIsAvailableToday] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingSellerProfile, setEditingSellerProfile] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);

  // Seller Profile editable fields
  const [stallName, setStallName] = useState(
    profile.stallName || `${profile.name} · Puesto Local`
  );
  const [producerBio, setProducerBio] = useState(
    profile.producerBio ||
      "Producción artesanal y cosecha del día entregada en punto público seguro, sin intermediarios."
  );
  const [defaultMeeting, setDefaultMeeting] = useState(
    profile.defaultMeetingPoint || "Plaza Principal / Mercado Local"
  );
  const [sellerWhatsapp, setSellerWhatsapp] = useState(
    profile.contact || "618 142 8910"
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Publish new harvest form state
  const [whatYouHave, setWhatYouHave] = useState("");
  const [description, setDescription] = useState("");
  const [meetingPoint, setMeetingPoint] = useState(
    profile.defaultMeetingPoint || ""
  );
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [category, setCategory] =
    useState<Exclude<ProducerCategory, "Todo">>("Comida y Gastronomía");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessNote, setPublishSuccessNote] = useState<string | null>(
    null
  );

  const [viewsCount, setViewsCount] = useState(42);
  const [inquiriesCount, setInquiriesCount] = useState(11);

  const smsTemplate = `NAFE ACTIVO | ${
    whatYouHave.trim() || "Queso fresco de rancho"
  } | ${meetingPoint.trim() || defaultMeeting} | ${cutoffTime}`;

  const handleSaveSellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const updated = await updateProfileInSupabase({
      stallName: stallName.trim(),
      producerBio: producerBio.trim(),
      defaultMeetingPoint: defaultMeeting.trim(),
      contact: sellerWhatsapp.trim(),
    });
    setSavingProfile(false);
    setEditingSellerProfile(false);
    setProfileSavedToast(true);
    onProfileUpdated(updated);
    window.setTimeout(() => setProfileSavedToast(false), 2600);
  };

  const handleCopySmsFormat = async () => {
    try {
      await navigator.clipboard.writeText(smsTemplate);
      setSmsCopied(true);
      window.setTimeout(() => setSmsCopied(false), 2600);
    } catch {
      setSmsCopied(true);
      window.setTimeout(() => setSmsCopied(false), 2600);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (uploadedPhotos.length >= 3) return;

    setIsUploadingPhoto(true);
    const file = files[0];
    const publicUrl = await uploadProducerPhotoToSupabase(file);

    if (publicUrl) {
      setUploadedPhotos((prev) => [...prev, publicUrl].slice(0, 3));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setUploadedPhotos((prev) =>
            [...prev, reader.result as string].slice(0, 3)
          );
        }
      };
      reader.readAsDataURL(file);
    }
    setIsUploadingPhoto(false);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatYouHave.trim()) {
      setFormError("Cuéntanos qué producto o servicio tienes disponible hoy.");
      return;
    }
    const finalMeeting = meetingPoint.trim() || defaultMeeting.trim();
    if (!finalMeeting) {
      setFormError(
        "Indica un punto de encuentro público y seguro (ej. Plaza, Mercado, Crucero)."
      );
      return;
    }
    if (!cutoffTime.trim()) {
      setFormError("Indica hasta qué hora estarás disponible hoy.");
      return;
    }

    setFormError(null);
    setIsPublishing(true);

    const created = await createNewHarvestPost({
      producerName: stallName.trim() || profile.name,
      productTitle: whatYouHave,
      category,
      description: description.trim() || producerBio.trim(),
      meetingPoint: finalMeeting,
      cutoffTime,
      whatsappContact: sellerWhatsapp,
      photos: uploadedPhotos,
      userCoords,
      isOfflineSimulated: isOffline,
    });

    setIsPublishing(false);
    setIsAvailableToday(true);
    setViewsCount((v) => v + 1);
    onPostCreated(created);

    setPublishSuccessNote(
      isOffline
        ? `¡Lote "${created.productTitle}" guardado en tu radar local!`
        : `¡Lote "${created.productTitle}" publicado en Supabase y visible en el mapa!`
    );

    setWhatYouHave("");
    setDescription("");
    setUploadedPhotos([]);
    setShowPublishModal(false);
  };

  const handleRenew24h = async (post: ProducerPost) => {
    await renewProducerPost24h(post.id);
    onPostUpdated(post.id, {
      freshnessStatus: "confirmed",
      freshnessLabel: "Confirmado hoy · Renovado 24h",
    });
    setPublishSuccessNote(`"${post.productTitle}" renovado por 24 horas más.`);
  };

  const handleTogglePause = async (post: ProducerPost) => {
    const nextStatus =
      post.freshnessStatus === "confirmed" ? "on_request" : "confirmed";
    await toggleProducerPostStatus(post.id, nextStatus);
    onPostUpdated(post.id, {
      freshnessStatus: nextStatus,
      freshnessLabel:
        nextStatus === "confirmed"
          ? "Confirmado hoy · Vigente 24h"
          : "Pausado · Bajo pedido",
    });
  };

  const handleDelete = async (post: ProducerPost) => {
    await deleteProducerPost(post.id);
    onPostDeleted(post.id);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. PERFIL DE VENDEDORA / PRODUCTOR (Editable + Supabase Sync) */}
      <section className="rounded-xl border border-[#949172]/40 bg-white/85 p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#3D562F] text-[#DBF7EC]">
              <Store className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#949172]">
                Perfil de vendedor(a)
              </span>
              <h2 className="truncate font-serif text-[23px] font-medium leading-tight text-[#13150C]/80">
                {stallName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingSellerProfile((prev) => !prev)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#949172]/45 bg-[#DEDED8]/60 px-3 text-[12px] font-semibold text-[#13150C] transition-colors hover:border-[#3D562F] hover:bg-white"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#3D562F]" />
            <span>{editingSellerProfile ? "Cerrar" : "Editar perfil"}</span>
          </button>
        </div>

        {!editingSellerProfile ? (
          <div className="mt-3 space-y-2 text-[13.5px] text-[#13150C]/75">
            <p className="leading-relaxed">{producerBio}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[12.5px] font-medium text-[#13150C]/80">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#3D562F]" />
                {defaultMeeting}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-[#3D562F]" />
                {sellerWhatsapp}
              </span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSaveSellerProfile}
            className="mt-4 space-y-3 border-t border-[#949172]/25 pt-4"
          >
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#13150C]/80">
                Nombre de tu puesto, rancho o taller
              </label>
              <input
                type="text"
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
                className="h-[44px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-3.5 text-[14px] text-[#13150C] outline-none focus:border-[#3D562F] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#13150C]/80">
                Tu historia (qué elaboras o cultivas)
              </label>
              <textarea
                rows={2}
                value={producerBio}
                onChange={(e) => setProducerBio(e.target.value)}
                className="w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-3.5 py-2.5 text-[14px] text-[#13150C] outline-none focus:border-[#3D562F] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#13150C]/80">
                  Punto de encuentro público habitual
                </label>
                <input
                  type="text"
                  value={defaultMeeting}
                  onChange={(e) => setDefaultMeeting(e.target.value)}
                  className="h-[44px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-3.5 text-[14px] text-[#13150C] outline-none focus:border-[#3D562F] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#13150C]/80">
                  WhatsApp directo para clientes
                </label>
                <input
                  type="text"
                  value={sellerWhatsapp}
                  onChange={(e) => setSellerWhatsapp(e.target.value)}
                  className="h-[44px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-3.5 text-[14px] text-[#13150C] outline-none focus:border-[#3D562F] focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#3D562F] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#334827]"
            >
              {savingProfile ? "Guardando perfil…" : "Guardar perfil de puesto"}
            </button>
          </form>
        )}

        {profileSavedToast && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-[#DBF7EC] px-3.5 py-2 text-[12.5px] font-semibold text-[#13150C]">
            <CheckCircle2 className="h-4 w-4 text-[#3D562F]" />
            <span>Perfil de vendedor(a) actualizado.</span>
          </div>
        )}
      </section>

      {/* 2. Tarjeta de Estado Hoy */}
      <section className="rounded-xl border border-[#949172]/40 bg-white/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#949172]">
              Disponibilidad hoy
            </span>
            <h2 className="mt-1 font-serif text-[22px] font-medium leading-[1.18] text-[#13150C]/80">
              ¿Tienes producto disponible hoy?
            </h2>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isAvailableToday}
            onClick={() => setIsAvailableToday((prev) => !prev)}
            className={[
              "relative inline-flex h-10 w-18 shrink-0 cursor-pointer items-center rounded-lg border-2 p-1 transition-colors duration-200",
              isAvailableToday
                ? "border-[#3D562F] bg-[#3D562F]"
                : "border-[#949172]/50 bg-[#DEDED8]",
            ].join(" ")}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={[
                "inline-block h-7 w-7 rounded-md shadow-xs",
                isAvailableToday ? "ml-auto bg-[#DBF7EC]" : "bg-[#949172]",
              ].join(" ")}
            />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isAvailableToday ? (
            <motion.div
              key="status-active"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center justify-between gap-2 rounded-md border border-[#3D562F]/25 bg-[#DBF7EC] px-4 py-3 text-[13px] font-semibold text-[#13150C]"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#3D562F]" />
                <span>Visible en el radar · Caduca en 24h</span>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-xs bg-[#3D562F]" />
            </motion.div>
          ) : (
            <motion.div
              key="status-paused"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center gap-2.5 rounded-md border border-[#9E4242]/20 bg-[#F7DBDB] px-4 py-3 text-[13px] font-semibold text-[#13150C]"
            >
              <PauseCircle className="h-4 w-4 shrink-0 text-[#7A2B2B]" />
              <span>Tu puesto está pausado en el radar</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {publishSuccessNote && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start justify-between gap-2.5 rounded-md border border-[#3D562F]/30 bg-[#DBF7EC] px-4 py-3 text-[13px] font-medium text-[#13150C]"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3D562F]" />
              <span>{publishSuccessNote}</span>
            </div>
            <button
              type="button"
              onClick={() => setPublishSuccessNote(null)}
              className="text-[#13150C]/60 hover:text-[#13150C]"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Publicar nueva cosecha / producto real con 1-3 fotos a Supabase Storage */}
      <div className="space-y-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => setShowPublishModal((prev) => !prev)}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#3D562F] px-6 text-[15.5px] font-semibold text-[#FFFFFF] shadow-[0_8px_20px_rgba(61,86,47,0.22)] transition-colors hover:bg-[#334827] active:bg-[#2B3E21]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
          <span>Publicar cosecha o producto de hoy</span>
        </motion.button>

        <AnimatePresence>
          {showPublishModal && (
            <motion.form
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              onSubmit={handlePublishSubmit}
              className="overflow-hidden rounded-xl border-2 border-[#3D562F]/40 bg-white/95 p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-[#3D562F]" />
                  <h3 className="font-serif text-[21px] font-medium text-[#13150C]/80">
                    Nueva publicación de hoy
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  aria-label="Cerrar formulario"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#949172] hover:bg-[#DEDED8] hover:text-[#13150C]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Section Buttons (Single-row horizontal carousel) */}
              <div className="nafe-scroll flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={[
                      "shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      category === cat
                        ? "border-[#3D562F] bg-[#3D562F] text-[#DEDED8]"
                        : "border-[#949172]/40 bg-white/60 text-[#13150C] hover:bg-white",
                    ].join(" ")}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor="lot-what"
                  className="mb-1 block text-[12.5px] font-semibold text-[#13150C]/80"
                >
                  1. ¿Qué tienes disponible hoy?
                </label>
                <input
                  id="lot-what"
                  type="text"
                  placeholder="Ej. Queso fresco, pinos de vivero, laja de cantera…"
                  value={whatYouHave}
                  onChange={(e) => {
                    setWhatYouHave(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="h-[48px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-4 text-[14.5px] text-[#13150C] placeholder:text-[#949172] outline-none focus:border-[#3D562F] focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="lot-desc"
                  className="mb-1 block text-[12.5px] font-semibold text-[#13150C]/80"
                >
                  2. Descripción breve
                </label>
                <textarea
                  id="lot-desc"
                  rows={2}
                  placeholder="Cuenta brevemente cómo fue elaborado o cosechado…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-4 py-2.5 text-[14px] text-[#13150C] placeholder:text-[#949172] outline-none focus:border-[#3D562F] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="lot-meeting"
                    className="mb-1 block text-[12.5px] font-semibold text-[#13150C]/80"
                  >
                    3. Punto de encuentro público
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3D562F]" />
                    <input
                      id="lot-meeting"
                      type="text"
                      placeholder={defaultMeeting}
                      value={meetingPoint}
                      onChange={(e) => {
                        setMeetingPoint(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="h-[48px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 pl-10 pr-4 text-[14px] text-[#13150C] placeholder:text-[#949172] outline-none focus:border-[#3D562F] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lot-cutoff"
                    className="mb-1 block text-[12.5px] font-semibold text-[#13150C]/80"
                  >
                    4. Horario límite hoy
                  </label>
                  <input
                    id="lot-cutoff"
                    type="text"
                    placeholder="Ej. 18:00"
                    value={cutoffTime}
                    onChange={(e) => {
                      setCutoffTime(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="h-[48px] w-full rounded-lg border border-[#949172]/45 bg-[#DEDED8]/45 px-4 text-[14px] text-[#13150C] placeholder:text-[#949172] outline-none focus:border-[#3D562F] focus:bg-white"
                  />
                </div>
              </div>

              {/* Real Photo Upload (1 to 3 photos to Supabase Storage producer-photos) */}
              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-[#13150C]/80">
                  Fotos reales (hasta 3 fotos desde tu galería o cámara)
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {uploadedPhotos.length < 3 && (
                    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#3D562F]/45 bg-[#DBF7EC]/60 px-3.5 text-[13px] font-semibold text-[#3D562F] transition-colors hover:bg-[#DBF7EC]">
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Subiendo foto…</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" />
                          <span>Agregar foto ({uploadedPhotos.length}/3)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="sr-only"
                      />
                    </label>
                  )}

                  {uploadedPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-12 w-12 overflow-hidden rounded-lg border border-[#949172]/45"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedPhotos((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        aria-label="Quitar foto"
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-sm bg-[#13150C]/75 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11.5px] text-[#13150C]/60">
                  Tu ubicación GPS se redondea automáticamente (~300–500 m) para
                  proteger la privacidad de tu parcela o casa.
                </p>
              </div>

              {formError && (
                <div className="rounded-md bg-[#F7DBDB] px-3.5 py-2.5 text-[12.5px] font-medium text-[#13150C]">
                  {formError}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="flex h-[46px] flex-1 items-center justify-center rounded-lg border border-[#949172]/45 bg-[#DEDED8]/60 text-[14px] font-semibold text-[#13150C]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex h-[46px] flex-2 items-center justify-center rounded-lg bg-[#3D562F] px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#334827]"
                >
                  {isPublishing ? "Publicando…" : "Publicar en el radar"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* 4. MIS PUBLICACIONES ACTIVAS (Renovar 24h / Pausar / Eliminar) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-[21px] font-medium text-[#13150C]/80">
            Mis publicaciones ({myPosts.length})
          </h3>
        </div>

        {myPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#949172]/50 bg-white/50 p-5 text-center text-[13.5px] text-[#13150C]/70">
            Aún no has publicado un lote hoy. Pulsa el botón verde de arriba
            para aparecer en el radar de tu zona.
          </div>
        ) : (
          <div className="space-y-2.5">
            {myPosts.map((post) => {
              const isConfirmed = post.freshnessStatus === "confirmed";
              return (
                <div
                  key={post.id}
                  className="rounded-xl border border-[#949172]/40 bg-white/85 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
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
                          "inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#13150C]",
                          isConfirmed ? "bg-[#DBF7EC]" : "bg-[#F7DBDB]",
                        ].join(" ")}
                      >
                        {post.freshnessLabel}
                      </span>
                      <h4 className="mt-1 truncate text-[15px] font-semibold text-[#13150C]">
                        {post.productTitle}
                      </h4>
                      <p className="truncate text-[12px] text-[#13150C]/65">
                        {post.meetingPoint}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#949172]/20 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleRenew24h(post)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#DBF7EC] px-3 text-[12px] font-semibold text-[#3D562F] hover:bg-[#c8f0e0]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Renovar 24h</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePause(post)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#949172]/40 bg-[#DEDED8]/60 px-3 text-[12px] font-semibold text-[#13150C] hover:bg-white"
                    >
                      {isConfirmed ? (
                        <>
                          <PauseCircle className="h-3.5 w-3.5 text-[#7A2B2B]" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-[#3D562F]" />
                          <span>Reactivar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg bg-[#F7DBDB] px-2.5 text-[12px] font-semibold text-[#7A2B2B] hover:bg-[#f1c7c7]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Borrar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Resumen Sencillo */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#949172]/35 bg-white/75 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DBF7EC] text-[#3D562F]">
            <Eye className="h-4 w-4" />
          </div>
          <p className="mt-3 font-serif text-[32px] font-medium leading-none text-[#13150C]/80">
            {viewsCount}
          </p>
          <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-[#13150C]/70">
            Vecinos que vieron tu puesto hoy
          </p>
        </div>

        <div className="rounded-xl border border-[#949172]/35 bg-white/75 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DBF7EC] text-[#3D562F]">
            <MessageCircle className="h-4 w-4" />
          </div>
          <p className="mt-3 font-serif text-[32px] font-medium leading-none text-[#13150C]/80">
            {inquiriesCount}
          </p>
          <p
            onClick={() => setInquiriesCount((c) => c + 1)}
            className="mt-1.5 text-[12.5px] font-medium leading-snug text-[#13150C]/70"
          >
            Consultas directas
          </p>
        </div>
      </section>

      {/* 6. Puente Rural SMS / WhatsApp */}
      <section className="rounded-xl border border-[#3D562F]/30 bg-gradient-to-br from-[#DBF7EC]/80 via-white/80 to-[#DEDED8]/90 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#3D562F] text-white shadow-xs">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="inline-block rounded-md bg-[#3D562F]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#3D562F]">
              Puente Rural SMS / WhatsApp
            </span>
            <h3 className="mt-1.5 font-serif text-[20px] font-medium leading-[1.2] text-[#13150C]/80">
              ¿Sin datos en el campo?
            </h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#13150C]/75">
              Actualiza tu disponibilidad enviando un WhatsApp o SMS al número
              NAFE.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#949172]/40 bg-[#DEDED8]/75 p-3 font-mono text-[12px] text-[#13150C]">
          {smsTemplate}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={handleCopySmsFormat}
          className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-[#3D562F] bg-white/90 px-4 py-2.5 text-[13.5px] font-semibold text-[#3D562F] transition-colors hover:bg-[#3D562F] hover:text-white"
        >
          {smsCopied ? (
            <>
              <Check className="h-4 w-4" />
              <span>¡Formato copiado al portapapeles!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copiar formato rápido de mensaje</span>
            </>
          )}
        </motion.button>
      </section>
    </div>
  );
}
