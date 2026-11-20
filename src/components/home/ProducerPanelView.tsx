"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LocalProfile } from "@/components/auth/validators";
import {
  ProducerCategory,
  ProducerPost,
  ChatConversation,
  checkBusinessLimitAllowed,
  createNewBusinessInSupabase,
  renewBusinessStock24h,
  toggleBusinessStockStatus,
  deleteBusinessFromSupabase,
  fetchAllConversations,
} from "@/lib/businesses";
import {
  SellerSalesSummary,
  logSale,
  getSellerSalesHistory,
  deleteSale,
  formatRelativeSaleDate,
} from "@/lib/sales";
import { uploadProductPhotos } from "@/lib/media";
import {
  updateProfileInSupabase,
  requestSellerVerification,
} from "@/lib/supabase";
import {
  GeoCoordinates,
  triggerNativeStockNotification,
} from "@/lib/nativeBridge";
import { getShortCategoryLabel } from "./BuyerRadarView";
import { getPlanConfig } from "@/lib/plans";

interface ProducerPanelViewProps {
  profile: LocalProfile;
  userCoords: GeoCoordinates;
  isOffline: boolean;
  myPosts: ProducerPost[];
  onPostCreated: (newPost: ProducerPost) => void;
  onPostUpdated: (postId: string, patch: Partial<ProducerPost>) => void;
  onPostDeleted: (postId: string) => void;
  onProfileUpdated: (next: LocalProfile) => void;
  onOpenSubscriptionModal: () => void;
  onStockNotificationCreated: (title: string, body: string) => void;
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

const TIER_LABELS = {
  free: "Plan Semilla",
  pro: "Plan Cosecha",
  coop: "Plan Cooperativa",
} as const;

type SellerWorkspaceSubTab = "businesses" | "sales";

export function ProducerPanelView({
  profile,
  userCoords,
  isOffline,
  myPosts,
  onPostCreated,
  onPostUpdated,
  onPostDeleted,
  onProfileUpdated,
  onOpenSubscriptionModal,
  onStockNotificationCreated,
}: ProducerPanelViewProps) {
  const [sellerSubTab, setSellerSubTab] =
    useState<SellerWorkspaceSubTab>("businesses");

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingSellerProfile, setEditingSellerProfile] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [verifyingBusy, setVerifyingBusy] = useState(false);

  const [stallName, setStallName] = useState(
    profile.stallName || `${profile.name} · Puesto Local`
  );
  const [producerBio, setProducerBio] = useState(
    profile.producerBio ||
      "Producción artesanal y cosecha del día entregada en punto público seguro, sin intermediarios."
  );
  const [defaultMeeting, setDefaultMeeting] = useState(
    profile.defaultMeetingPoint || "Plaza Principal"
  );
  const [sellerWhatsapp, setSellerWhatsapp] = useState(
    profile.contact || "618 142 8910"
  );
  const [savingProfile, setSavingProfile] = useState(false);

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

  // Sales Panel State
  const [salesSummary, setSalesSummary] = useState<SellerSalesSummary>({
    sales: [],
    totalCount: 0,
    verifiedCount: 0,
    todayCount: 0,
    last7DaysCount: 0,
    privateAmountTotalMxn: 0,
    hasPrivateAmounts: false,
  });
  const [showPrivateAmounts, setShowPrivateAmounts] = useState(false);
  const [showLogSaleForm, setShowLogSaleForm] = useState(false);
  const [saleBusinessId, setSaleBusinessId] = useState<string>(
    myPosts[0]?.id || ""
  );
  const [saleItemSummary, setSaleItemSummary] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleAmountMxn, setSaleAmountMxn] = useState("");
  const [saleConversationId, setSaleConversationId] = useState("");
  const [recentConversations, setRecentConversations] = useState<
    ChatConversation[]
  >([]);
  const [saleFormError, setSaleFormError] = useState<string | null>(null);
  const [isLoggingSale, setIsLoggingSale] = useState(false);

  const currentTier = profile.subscriptionTier || "free";
  const planConfig = getPlanConfig(currentTier);
  const maxPhotosAllowed = planConfig.maxPhotos;
  const smsTemplate = `NAFE ACTIVO | ${
    whatYouHave.trim() || "Queso fresco"
  } | ${meetingPoint.trim() || defaultMeeting} | ${cutoffTime}`;

  useEffect(() => {
    if (!saleBusinessId && myPosts.length > 0) {
      setSaleBusinessId(myPosts[0].id);
    }
  }, [myPosts, saleBusinessId]);

  const reloadSalesHistory = useCallback(async () => {
    const summary = await getSellerSalesHistory(
      profile.userId,
      myPosts.map((p) => ({ id: p.id, productTitle: p.productTitle }))
    );
    setSalesSummary(summary);
  }, [profile.userId, myPosts]);

  useEffect(() => {
    void reloadSalesHistory();
    fetchAllConversations().then(setRecentConversations);
  }, [reloadSalesHistory]);

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
    onProfileUpdated(updated);
    setPublishSuccessNote("Perfil actualizado");
  };

  const handleRequestVerification = async () => {
    setVerifyingBusy(true);
    const updated = await requestSellerVerification({
      stallName: stallName.trim(),
      craftDescription: producerBio.trim(),
      publicPoint: defaultMeeting.trim(),
    });
    setVerifyingBusy(false);
    onProfileUpdated(updated);
    setPublishSuccessNote("Puesto verificado");
  };

  const handleOpenNewBusinessForm = () => {
    const check = checkBusinessLimitAllowed(myPosts.length, currentTier);
    if (!check.allowed) {
      onOpenSubscriptionModal();
      return;
    }
    setShowPublishModal((prev) => !prev);
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
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (uploadedPhotos.length >= maxPhotosAllowed) return;

    setIsUploadingPhoto(true);
    const filesArray = Array.from(fileList).slice(
      0,
      maxPhotosAllowed - uploadedPhotos.length
    );
    const urls = await uploadProductPhotos(
      filesArray,
      profile.userId || "local-user"
    );
    setUploadedPhotos((prev) => [...prev, ...urls].slice(0, maxPhotosAllowed));
    setIsUploadingPhoto(false);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = checkBusinessLimitAllowed(myPosts.length, currentTier);
    if (!check.allowed) {
      onOpenSubscriptionModal();
      return;
    }

    if (!whatYouHave.trim()) {
      setFormError("Ingresa el nombre del negocio o producto.");
      return;
    }
    const finalMeeting = meetingPoint.trim() || defaultMeeting.trim();
    if (!finalMeeting) {
      setFormError("Ingresa un punto de encuentro.");
      return;
    }

    setFormError(null);
    setIsPublishing(true);

    const res = await createNewBusinessInSupabase({
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
      stockDurationHours: planConfig.stockDurationHours,
    });

    setIsPublishing(false);

    if (!res.ok) {
      if (res.subscriptionRequired) {
        onOpenSubscriptionModal();
        return;
      }
      setFormError(res.error || "No se pudo publicar.");
      return;
    }

    if (res.post) {
      onPostCreated(res.post);
      setSaleBusinessId(res.post.id);
      setPublishSuccessNote(`"${res.post.productTitle}" publicado`);
    }

    setWhatYouHave("");
    setDescription("");
    setUploadedPhotos([]);
    setShowPublishModal(false);
  };

  const handleRenew24h = async (post: ProducerPost) => {
    await renewBusinessStock24h(post.id, planConfig.stockDurationHours);
    onPostUpdated(post.id, {
      freshnessStatus: "confirmed",
      freshnessLabel: "Disponible hoy",
      isInStock: true,
    });
    const notifTitle = "Stock disponible";
    const notifBody = `${post.producerName} confirmó stock de "${post.productTitle}" en ${post.meetingPoint}`;
    onStockNotificationCreated(notifTitle, notifBody);
    void triggerNativeStockNotification(notifTitle, notifBody);
    setPublishSuccessNote(planConfig.stockRenewedMessage);
  };

  const handleTogglePause = async (post: ProducerPost) => {
    const nextInStock = post.freshnessStatus !== "confirmed";
    await toggleBusinessStockStatus(post.id, nextInStock);
    onPostUpdated(post.id, {
      freshnessStatus: nextInStock ? "confirmed" : "on_request",
      freshnessLabel: nextInStock ? "Disponible hoy" : "Bajo pedido",
      isInStock: nextInStock,
    });
    if (nextInStock) {
      const notifTitle = "Stock activado";
      const notifBody = `${post.producerName} activó "${post.productTitle}" en ${post.meetingPoint}`;
      onStockNotificationCreated(notifTitle, notifBody);
      void triggerNativeStockNotification(notifTitle, notifBody);
    }
  };

  const handleDelete = async (post: ProducerPost) => {
    await deleteBusinessFromSupabase(post.id);
    onPostDeleted(post.id);
  };

  const handleLogSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBizId = saleBusinessId || myPosts[0]?.id;
    if (!targetBizId) {
      setSaleFormError("Registra primero un negocio.");
      return;
    }
    if (!saleItemSummary.trim()) {
      setSaleFormError("Ingresa el producto vendido.");
      return;
    }

    setSaleFormError(null);
    setIsLoggingSale(true);

    const targetBiz = myPosts.find((p) => p.id === targetBizId);
    const linkedConv = recentConversations.find(
      (c) => c.id === saleConversationId
    );

    const parsedAmount =
      saleAmountMxn.trim() !== "" ? Number(saleAmountMxn) : null;

    const result = await logSale({
      businessId: targetBizId,
      businessName: targetBiz?.productTitle || stallName,
      itemSummary: saleItemSummary.trim(),
      quantity: Math.max(1, Number(saleQuantity) || 1),
      amountMxn: parsedAmount,
      buyerId: linkedConv?.buyerId ?? null,
      conversationId: linkedConv?.id ?? null,
    });

    setIsLoggingSale(false);

    if (!result.ok) {
      setSaleFormError(result.error || "No se pudo registrar la venta.");
      return;
    }

    if (targetBiz) {
      onPostUpdated(targetBiz.id, {
        completedSalesCount: (targetBiz.completedSalesCount || 0) + 1,
      });
    }

    setSaleItemSummary("");
    setSaleQuantity("1");
    setSaleAmountMxn("");
    setSaleConversationId("");
    setShowLogSaleForm(false);
    setPublishSuccessNote("Venta registrada");
    await reloadSalesHistory();
  };

  const handleDeleteSaleRecord = async (saleId: string, businessId: string) => {
    await deleteSale(saleId);
    const targetBiz = myPosts.find((p) => p.id === businessId);
    if (targetBiz && targetBiz.completedSalesCount > 0) {
      onPostUpdated(targetBiz.id, {
        completedSalesCount: Math.max(0, targetBiz.completedSalesCount - 1),
      });
    }
    await reloadSalesHistory();
  };

  const handleExportSalesCsv = (monthlyByStore = false) => {
    const rows = salesSummary.sales;
    let csvContent = "";

    if (monthlyByStore) {
      const grouped = new Map<
        string,
        { count: number; verified: number; totalMxn: number }
      >();
      for (const s of rows) {
        const key = s.businessName || "Mi puesto";
        const cur = grouped.get(key) || { count: 0, verified: 0, totalMxn: 0 };
        cur.count += 1;
        if (s.buyerConfirmed) cur.verified += 1;
        if (typeof s.amountMxn === "number") cur.totalMxn += s.amountMxn;
        grouped.set(key, cur);
      }
      csvContent =
        "Puesto,Entregas totales,Entregas confirmadas,Total MXN\n" +
        Array.from(grouped.entries())
          .map(
            ([name, stat]) =>
              `"${name.replace(/"/g, '""')}",${stat.count},${stat.verified},${stat.totalMxn.toFixed(2)}`
          )
          .join("\n");
    } else {
      csvContent =
        "Fecha,Negocio,Producto,Cantidad,Monto MXN,Confirmada\n" +
        rows
          .map(
            (s) =>
              `"${new Date(s.createdAt).toLocaleString("es-MX")}","${(
                s.businessName || ""
              ).replace(/"/g, '""')}","${s.itemSummary.replace(/"/g, '""')}",${
                s.quantity
              },${s.amountMxn ?? ""},${s.buyerConfirmed ? "Si" : "No"}`
          )
          .join("\n");
    }

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = monthlyByStore
      ? "nafe-reporte-mensual-multipuesto.csv"
      : "nafe-ventas.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setPublishSuccessNote(
      monthlyByStore ? "Reporte mensual descargado" : "CSV exportado"
    );
  };

  const topOrderedProducts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const sale of salesSummary.sales) {
      const key = sale.itemSummary.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + (sale.quantity || 1));
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [salesSummary.sales]);

  return (
    <div className="space-y-3.5 pb-8">
      {/* 1. Perfil del Puesto (Cero cajas de íconos) */}
      <section className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {profile.isVerified || currentTier !== "free" ? (
                <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                  {planConfig.trustBadgeLabel}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={verifyingBusy}
                  onClick={handleRequestVerification}
                  className="rounded-md bg-[#EFEFEA] px-2 py-0.5 text-xs font-medium text-[#2B4628] transition-colors hover:bg-[#1F3A26] hover:text-[#F4F7F4]"
                >
                  {verifyingBusy ? "Verificando…" : "Verificar puesto"}
                </button>
              )}

              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className="rounded-md bg-[#EFEFEA] px-2 py-0.5 text-xs font-medium text-[#13150C]"
              >
                {TIER_LABELS[currentTier]}
              </button>
            </div>

            <h2 className="mt-1.5 truncate text-lg font-semibold tracking-tight text-[#13150C]">
              {stallName}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setEditingSellerProfile((prev) => !prev)}
            className="h-8 shrink-0 rounded-lg bg-[#EFEFEA] px-3 text-xs font-semibold text-[#13150C] transition-colors hover:bg-[#F7F7F4]"
          >
            {editingSellerProfile ? "Cerrar" : "Editar"}
          </button>
        </div>

        {!editingSellerProfile ? (
          <div className="space-y-1 text-sm text-[#6E6D5F]">
            <p className="leading-relaxed">{producerBio}</p>
            <p className="text-xs font-medium text-[#13150C]">
              {defaultMeeting}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveSellerProfile} className="space-y-2.5 pt-1">
            <input
              type="text"
              placeholder="Nombre del negocio"
              value={stallName}
              onChange={(e) => setStallName(e.target.value)}
              className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
            />

            <textarea
              rows={2}
              placeholder="Descripción"
              value={producerBio}
              onChange={(e) => setProducerBio(e.target.value)}
              className="w-full rounded-lg bg-[#EFEFEA] px-3 py-2 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
            />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Punto de encuentro"
                value={defaultMeeting}
                onChange={(e) => setDefaultMeeting(e.target.value)}
                className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
              />

              <input
                type="text"
                placeholder="WhatsApp"
                value={sellerWhatsapp}
                onChange={(e) => setSellerWhatsapp(e.target.value)}
                className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[#2B4628] px-4 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
            >
              {savingProfile ? "Guardando…" : "Guardar"}
            </button>
          </form>
        )}
      </section>

      {/* Selector sin bordes ni íconos: Mis negocios | Ventas */}
      <div
        role="tablist"
        aria-label="Secciones de Mi puesto"
        className="grid grid-cols-2 gap-1 rounded-lg bg-[#EFEFEA] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={sellerSubTab === "businesses"}
          onClick={() => setSellerSubTab("businesses")}
          className={[
            "h-9 rounded-md px-3 text-sm font-semibold transition-all",
            sellerSubTab === "businesses"
              ? "bg-[#2B4628] text-[#F7F7F4]"
              : "text-[#6E6D5F] hover:text-[#13150C]",
          ].join(" ")}
        >
          Mis negocios ({myPosts.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={sellerSubTab === "sales"}
          onClick={() => setSellerSubTab("sales")}
          className={[
            "h-9 rounded-md px-3 text-sm font-semibold transition-all",
            sellerSubTab === "sales"
              ? "bg-[#2B4628] text-[#F7F7F4]"
              : "text-[#6E6D5F] hover:text-[#13150C]",
          ].join(" ")}
        >
          Ventas ({salesSummary.totalCount})
        </button>
      </div>

      <AnimatePresence>
        {publishSuccessNote && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-2 rounded-lg bg-[#1F3A26] px-3.5 py-2.5 text-xs font-medium text-[#F4F7F4]"
          >
            <span>{publishSuccessNote}</span>
            <button
              type="button"
              onClick={() => setPublishSuccessNote(null)}
              aria-label="Cerrar aviso"
              className="bg-transparent p-1.5 text-[#F4F7F4]/70 transition-colors hover:text-[#F4F7F4]"
            >
              <X className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {sellerSubTab === "sales" ? (
        /* =====================================================================
           PESTAÑA VENTAS DEL VENDEDOR
        ===================================================================== */
        <div className="space-y-3.5">
          {/* Resumen privado compacto */}
          <div
            className={[
              "grid gap-2.5",
              salesSummary.hasPrivateAmounts ? "grid-cols-3" : "grid-cols-2",
            ].join(" ")}
          >
            <div className="rounded-xl bg-[#FFFFFF] p-3.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
              <span className="block text-xs text-[#6E6D5F]">
                Ventas registradas
              </span>
              <span className="mt-1 block text-lg font-semibold text-[#13150C]">
                {salesSummary.totalCount}
              </span>
              <span className="mt-0.5 block text-xs text-[#6E6D5F]">
                {salesSummary.todayCount} hoy · {salesSummary.last7DaysCount} en
                7d
              </span>
            </div>

            <div className="rounded-xl bg-[#FFFFFF] p-3.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-[#6E6D5F]">Confirmadas</span>
                <span className="rounded-md bg-[#1F3A26] px-1.5 py-0.5 text-[10px] font-medium text-[#F4F7F4]">
                  Vecinos
                </span>
              </div>
              <span className="mt-1 block text-lg font-semibold text-[#13150C]">
                {salesSummary.verifiedCount}
              </span>
            </div>

            {salesSummary.hasPrivateAmounts && (
              <div className="rounded-xl bg-[#FFFFFF] p-3.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-[#6E6D5F]">Total privado</span>
                  <button
                    type="button"
                    onClick={() => setShowPrivateAmounts((p) => !p)}
                    className="text-xs font-medium text-[#2B4628]"
                  >
                    {showPrivateAmounts ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <span className="mt-1 block text-lg font-semibold text-[#13150C]">
                  {showPrivateAmounts
                    ? `$${salesSummary.privateAmountTotalMxn.toLocaleString("es-MX")}`
                    : "••••"}
                </span>
              </div>
            )}
          </div>

          {/* Botón principal Registrar venta (Solo texto) */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setShowLogSaleForm((prev) => !prev)}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
            >
              Registrar venta
            </button>

            <AnimatePresence>
              {showLogSaleForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogSaleSubmit}
                  className="space-y-3 overflow-hidden rounded-xl bg-[#FFFFFF] p-4 shadow-[0_4px_18px_rgba(19,21,12,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#13150C]">
                      Registrar venta
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowLogSaleForm(false)}
                      aria-label="Cerrar formulario de venta"
                      className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
                    >
                      <X className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  </div>

                  {myPosts.length > 1 && (
                    <select
                      value={saleBusinessId}
                      onChange={(e) => setSaleBusinessId(e.target.value)}
                      aria-label="Negocio"
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] outline-none"
                    >
                      {myPosts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.productTitle}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Producto"
                    value={saleItemSummary}
                    onChange={(e) => {
                      setSaleItemSummary(e.target.value);
                      if (saleFormError) setSaleFormError(null);
                    }}
                    className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                  />

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="number"
                      min={1}
                      placeholder="Cantidad"
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(e.target.value)}
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                    />

                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Monto (opcional)"
                      value={saleAmountMxn}
                      onChange={(e) => setSaleAmountMxn(e.target.value)}
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                    />
                  </div>

                  {recentConversations.length > 0 && (
                    <select
                      value={saleConversationId}
                      onChange={(e) => setSaleConversationId(e.target.value)}
                      aria-label="Conversación"
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] outline-none"
                    >
                      <option value="">Venta directa en puesto</option>
                      {recentConversations.map((c) => (
                        <option key={c.id} value={c.id}>
                          Chat: {c.businessName}
                        </option>
                      ))}
                    </select>
                  )}

                  {saleFormError && (
                    <div className="rounded-md bg-[#F2DCDC] px-3 py-2 text-xs font-medium text-[#7A2727]">
                      {saleFormError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogSaleForm(false)}
                      className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#EFEFEA] text-sm font-medium text-[#13150C]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingSale}
                      className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#2B4628] px-4 text-sm font-medium text-[#F7F7F4] hover:bg-[#223820]"
                    >
                      {isLoggingSale ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Estadísticas avanzadas y Exportación según Plan (Cosecha / Cooperativa) */}
          <section className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#13150C]">
                Estadísticas y reportes ({planConfig.name})
              </h3>
              {!planConfig.hasCsvExport && (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="rounded-md bg-[#EFEFEA] px-2.5 py-1 text-xs font-semibold text-[#2B4628] hover:bg-[#2B4628] hover:text-[#F7F7F4]"
                >
                  Mejorar plan
                </button>
              )}
            </div>

            {planConfig.hasAdvancedStats ? (
              <div className="space-y-2.5">
                <div className="rounded-lg bg-[#F7F7F4] p-3 text-xs">
                  <p className="font-semibold text-[#13150C]">
                    Productos más pedidos
                  </p>
                  {topOrderedProducts.length === 0 ? (
                    <p className="mt-1 text-[#6E6D5F]">
                      Registra entregas para ver tus productos más solicitados.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-[#13150C]">
                      {topOrderedProducts.map(([prod, qty]) => (
                        <li
                          key={prod}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{prod}</span>
                          <span className="shrink-0 font-semibold text-[#2B4628]">
                            {qty} uds
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={salesSummary.sales.length === 0}
                    onClick={() => handleExportSalesCsv(false)}
                    className="h-9 flex-1 rounded-lg bg-[#EFEFEA] px-3 text-xs font-semibold text-[#13150C] transition-colors hover:bg-[#2B4628] hover:text-[#F7F7F4] disabled:opacity-50"
                  >
                    Exportar Excel / CSV
                  </button>

                  {planConfig.hasMonthlyReport && (
                    <button
                      type="button"
                      disabled={salesSummary.sales.length === 0}
                      onClick={() => handleExportSalesCsv(true)}
                      className="h-9 flex-1 rounded-lg bg-[#2B4628] px-3 text-xs font-semibold text-[#F7F7F4] transition-colors hover:bg-[#223820] disabled:opacity-50"
                    >
                      Reporte mensual multi-puesto
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6E6D5F]">
                El Plan Semilla incluye registro básico de entregas. Activa Plan
                Cosecha o Cooperativa para ver productos más pedidos, métricas
                multi-puesto y exportar a Excel/CSV.
              </p>
            )}
          </section>

          {/* Lista del historial de ventas del vendedor */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#13150C]">
              Historial de ventas
            </h3>

            {salesSummary.sales.length === 0 ? (
              <div className="rounded-xl bg-[#FFFFFF] p-5 text-center text-sm text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                Sin ventas registradas
              </div>
            ) : (
              <div className="space-y-2">
                {salesSummary.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-3.5 shadow-[0_2px_10px_rgba(19,21,12,0.04)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={[
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            sale.buyerConfirmed
                              ? "bg-[#1F3A26] text-[#F4F7F4]"
                              : "bg-[#EFEFEA] text-[#13150C]",
                          ].join(" ")}
                        >
                          {sale.buyerConfirmed ? "Confirmada" : "Registrada"}
                        </span>

                        <span className="text-xs text-[#6E6D5F]">
                          {formatRelativeSaleDate(sale.createdAt)}
                        </span>

                        {sale.amountMxn !== null && showPrivateAmounts && (
                          <span className="rounded-md bg-[#EFEFEA] px-2 py-0.5 text-xs font-medium text-[#2B4628]">
                            ${sale.amountMxn.toLocaleString("es-MX")} MXN
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-[15px] font-medium text-[#13150C]">
                        {sale.itemSummary}
                        {sale.quantity > 1 ? ` (×${sale.quantity})` : ""}
                      </p>

                      <p className="truncate text-xs text-[#6E6D5F]">
                        {sale.businessName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteSaleRecord(sale.id, sale.businessId)
                      }
                      className="rounded-lg bg-[#EFEFEA] px-2.5 py-1 text-xs font-medium text-[#6E6D5F] transition-colors hover:bg-[#F2DCDC] hover:text-[#7A2727]"
                    >
                      Borrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* =====================================================================
           PESTAÑA MIS NEGOCIOS
        ===================================================================== */
        <>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleOpenNewBusinessForm}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#2B4628] px-5 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
            >
              Publicar negocio
            </button>

            <AnimatePresence>
              {showPublishModal && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePublishSubmit}
                  className="space-y-3 overflow-hidden rounded-xl bg-[#FFFFFF] p-4 shadow-[0_4px_18px_rgba(19,21,12,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#13150C]">
                      Nuevo negocio
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPublishModal(false)}
                      aria-label="Cerrar formulario"
                      className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
                    >
                      <X className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  </div>

                  <div className="nafe-scroll flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={[
                          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          category === cat
                            ? "bg-[#2B4628] text-[#F7F7F4]"
                            : "bg-[#EFEFEA] text-[#13150C]",
                        ].join(" ")}
                      >
                        {getShortCategoryLabel(cat)}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Nombre del negocio"
                    value={whatYouHave}
                    onChange={(e) => {
                      setWhatYouHave(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Descripción"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg bg-[#EFEFEA] px-3 py-2 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                  />

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Punto de encuentro"
                      value={meetingPoint}
                      onChange={(e) => {
                        setMeetingPoint(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                    />

                    <input
                      type="text"
                      placeholder="Horario"
                      value={cutoffTime}
                      onChange={(e) => setCutoffTime(e.target.value)}
                      className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] placeholder:text-[#6E6D5F] outline-none"
                    />
                  </div>

                  {/* Subida de fotos reales a Supabase Storage */}
                  <div className="flex flex-wrap items-center gap-2">
                    {uploadedPhotos.length < maxPhotosAllowed && (
                      <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#EFEFEA] px-3 text-xs font-semibold text-[#2B4628] transition-colors hover:bg-[#1F3A26] hover:text-[#F4F7F4]">
                        <span>
                          {isUploadingPhoto
                            ? "Subiendo…"
                            : `Subir foto (${uploadedPhotos.length}/${maxPhotosAllowed})`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {uploadedPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative h-11 w-11 overflow-hidden rounded-lg bg-[#EFEFEA]"
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
                          className="absolute right-0 top-0 bg-transparent p-1 text-white"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.6} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formError && (
                    <div className="rounded-md bg-[#F2DCDC] px-3 py-2 text-xs font-medium text-[#7A2727]">
                      {formError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPublishModal(false)}
                      className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#EFEFEA] text-sm font-medium text-[#13150C]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#2B4628] px-4 text-sm font-medium text-[#F7F7F4] hover:bg-[#223820]"
                    >
                      {isPublishing ? "Publicando…" : "Publicar"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#13150C]">
                Mis negocios ({myPosts.length})
              </h3>
              {currentTier === "free" && myPosts.length >= 1 && (
                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="text-xs font-semibold text-[#2B4628] hover:underline"
                >
                  Planes
                </button>
              )}
            </div>

            {myPosts.length === 0 ? (
              <div className="rounded-xl bg-[#FFFFFF] p-5 text-center text-sm text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                Sin negocios registrados
              </div>
            ) : (
              <div className="space-y-2">
                {myPosts.map((post) => {
                  const isConfirmed = post.freshnessStatus === "confirmed";
                  return (
                    <div
                      key={post.id}
                      className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={[
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              isConfirmed
                                ? "bg-[#1F3A26] text-[#F4F7F4]"
                                : "bg-[#F2DCDC] text-[#7A2727]",
                            ].join(" ")}
                          >
                            {post.freshnessLabel}
                          </span>

                          {post.completedSalesCount > 0 && (
                            <span className="rounded-md bg-[#EFEFEA] px-2 py-0.5 text-xs font-medium text-[#13150C]">
                              {post.completedSalesCount}{" "}
                              {post.completedSalesCount === 1
                                ? "entrega"
                                : "entregas"}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1.5 truncate text-[15px] font-medium text-[#13150C]">
                          {post.productTitle}
                        </h4>
                        <p className="truncate text-xs text-[#6E6D5F]">
                          {post.meetingPoint}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRenew24h(post)}
                          className="h-8 rounded-lg bg-[#1F3A26] px-3 text-xs font-medium text-[#F4F7F4]"
                        >
                          {planConfig.stockRenewLabel}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePause(post)}
                          className="h-8 rounded-lg bg-[#EFEFEA] px-3 text-xs font-medium text-[#13150C]"
                        >
                          {isConfirmed ? "Pausar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(post)}
                          className="ml-auto h-8 rounded-lg bg-[#F2DCDC] px-2.5 text-xs font-medium text-[#7A2727]"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Puente Rural SMS / WhatsApp */}
          <section className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
            <h3 className="text-sm font-semibold text-[#13150C]">
              Formato SMS
            </h3>

            <div className="rounded-lg bg-[#EFEFEA] p-2.5 font-mono text-xs text-[#13150C]">
              {smsTemplate}
            </div>

            <button
              type="button"
              onClick={handleCopySmsFormat}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-[#EFEFEA] px-4 text-xs font-semibold text-[#13150C] transition-colors hover:bg-[#2B4628] hover:text-[#F7F7F4]"
            >
              {smsCopied ? "Copiado" : "Copiar formato"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
