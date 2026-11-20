"use client";

import { supabase } from "./supabase";
import {
  getDemoPublicSalesForBusiness,
  isDemoBusinessId,
} from "./demoBusinesses";

export interface SellerSaleRecord {
  id: string;
  businessId: string;
  businessName: string;
  sellerId: string;
  buyerId: string | null;
  conversationId: string | null;
  itemSummary: string;
  quantity: number;
  amountMxn: number | null;
  buyerConfirmed: boolean;
  buyerConfirmedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PublicBusinessSale {
  id: string;
  businessId: string;
  itemSummary: string;
  quantity: number;
  buyerConfirmed: boolean;
  buyerConfirmedAt: string | null;
  createdAt: string;
  verificationLabel: string;
}

export interface SellerSalesSummary {
  sales: SellerSaleRecord[];
  totalCount: number;
  verifiedCount: number;
  todayCount: number;
  last7DaysCount: number;
  privateAmountTotalMxn: number;
  hasPrivateAmounts: boolean;
}

const LOCAL_SALES_CACHE_KEY = "nafe_seller_sales_cache_v1";

function loadLocalSalesCache(): SellerSaleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SALES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SellerSaleRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalSalesCache(records: SellerSaleRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_SALES_CACHE_KEY,
      JSON.stringify(records.slice(0, 100))
    );
  } catch {
    // Ignore
  }
}

export function formatRelativeSaleDate(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 60 * 1000) {
    return "Hace un momento";
  }
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Ayer";
  }
  if (diffDays < 30) {
    return `Hace ${diffDays} días`;
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

function buildSalesSummary(sales: SellerSaleRecord[]): SellerSalesSummary {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let verifiedCount = 0;
  let todayCount = 0;
  let last7DaysCount = 0;
  let privateAmountTotalMxn = 0;
  let hasPrivateAmounts = false;

  for (const s of sales) {
    if (s.buyerConfirmed) verifiedCount += 1;
    const ts = new Date(s.createdAt).getTime();
    if (ts >= startOfToday.getTime()) todayCount += 1;
    if (ts >= sevenDaysAgo) last7DaysCount += 1;
    if (typeof s.amountMxn === "number" && s.amountMxn > 0) {
      hasPrivateAmounts = true;
      privateAmountTotalMxn += s.amountMxn;
    }
  }

  return {
    sales,
    totalCount: sales.length,
    verifiedCount,
    todayCount,
    last7DaysCount,
    privateAmountTotalMxn: Math.round(privateAmountTotalMxn * 100) / 100,
    hasPrivateAmounts,
  };
}

/**
 * Registra una venta real en `public.sales` (y la sincroniza con el caché local del vendedor).
 */
export async function logSale(params: {
  businessId: string;
  businessName?: string;
  itemSummary: string;
  quantity?: number;
  amountMxn?: number | null;
  buyerId?: string | null;
  conversationId?: string | null;
  notes?: string | null;
}): Promise<{ ok: boolean; sale?: SellerSaleRecord; error?: string }> {
  const cleanSummary = params.itemSummary.trim();
  if (!cleanSummary) {
    return { ok: false, error: "Describe qué producto o lote entregaste." };
  }

  const cleanQty = Math.max(1, Math.round(Number(params.quantity) || 1));
  const cleanAmount =
    params.amountMxn !== undefined &&
    params.amountMxn !== null &&
    !Number.isNaN(Number(params.amountMxn)) &&
    Number(params.amountMxn) > 0
      ? Math.round(Number(params.amountMxn) * 100) / 100
      : null;

  const nowIso = new Date().toISOString();

  const localDraft: SellerSaleRecord = {
    id: `local-sale-${Date.now()}`,
    businessId: params.businessId,
    businessName: params.businessName || "Mi negocio",
    sellerId: "local-seller",
    buyerId: params.buyerId ?? null,
    conversationId: params.conversationId ?? null,
    itemSummary: cleanSummary,
    quantity: cleanQty,
    amountMxn: cleanAmount,
    buyerConfirmed: false,
    buyerConfirmedAt: null,
    notes: params.notes?.trim() || null,
    createdAt: nowIso,
  };

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !params.businessId.startsWith("local-")
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        localDraft.sellerId = user.id;

        const { data: inserted, error } = await supabase
          .from("sales")
          .insert({
            business_id: params.businessId,
            seller_id: user.id,
            buyer_id: params.buyerId || null,
            conversation_id:
              params.conversationId && !params.conversationId.startsWith("conv-")
                ? params.conversationId
                : null,
            item_summary: cleanSummary,
            quantity: cleanQty,
            amount_mxn: cleanAmount,
            notes: localDraft.notes,
          })
          .select(
            "id, business_id, seller_id, buyer_id, conversation_id, item_summary, quantity, amount_mxn, buyer_confirmed, buyer_confirmed_at, notes, created_at"
          )
          .maybeSingle();

        if (!error && inserted) {
          localDraft.id = String(inserted.id);
          localDraft.createdAt = String(inserted.created_at || nowIso);
        }
      }
    } catch {
      // Fallback a caché local cuando no hay sesión o red
    }
  }

  const cached = loadLocalSalesCache();
  saveLocalSalesCache([localDraft, ...cached]);

  return { ok: true, sale: localDraft };
}

/**
 * Permite al comprador confirmar la entrega (`buyer_confirmed = true`).
 */
export async function confirmSaleAsBuyer(
  saleId: string
): Promise<{ ok: boolean; confirmedAt: string }> {
  const confirmedAt = new Date().toISOString();

  const cached = loadLocalSalesCache().map((item) =>
    item.id === saleId
      ? { ...item, buyerConfirmed: true, buyerConfirmedAt: confirmedAt }
      : item
  );
  saveLocalSalesCache(cached);

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !saleId.startsWith("local-sale-")
  ) {
    try {
      await supabase
        .from("sales")
        .update({
          buyer_confirmed: true,
          buyer_confirmed_at: confirmedAt,
        })
        .eq("id", saleId);
    } catch {
      // Ignore offline
    }
  }

  return { ok: true, confirmedAt };
}

/**
 * Obtiene el historial completo de ventas del vendedor con métricas y montos privados.
 */
export async function getSellerSalesHistory(
  sellerId?: string,
  myBusinesses: Array<{ id: string; productTitle: string }> = []
): Promise<SellerSalesSummary> {
  const businessNameMap = new Map<string, string>();
  for (const b of myBusinesses) {
    businessNameMap.set(b.id, b.productTitle);
  }

  const localCached = loadLocalSalesCache();

  if (typeof navigator === "undefined" || !navigator.onLine) {
    return buildSalesSummary(localCached);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const effectiveSellerId = user?.id || sellerId;

    if (!effectiveSellerId) {
      return buildSalesSummary(localCached);
    }

    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, business_id, seller_id, buyer_id, conversation_id, item_summary, quantity, amount_mxn, buyer_confirmed, buyer_confirmed_at, notes, created_at"
      )
      .eq("seller_id", effectiveSellerId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) {
      return buildSalesSummary(localCached);
    }

    const remoteSales: SellerSaleRecord[] = data.map((row) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      businessName:
        businessNameMap.get(String(row.business_id)) || "Puesto local",
      sellerId: String(row.seller_id),
      buyerId: row.buyer_id ? String(row.buyer_id) : null,
      conversationId: row.conversation_id ? String(row.conversation_id) : null,
      itemSummary: String(row.item_summary),
      quantity: Number(row.quantity) || 1,
      amountMxn:
        row.amount_mxn !== null && row.amount_mxn !== undefined
          ? Number(row.amount_mxn)
          : null,
      buyerConfirmed: Boolean(row.buyer_confirmed),
      buyerConfirmedAt: row.buyer_confirmed_at
        ? String(row.buyer_confirmed_at)
        : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at),
    }));

    // Combinar registros locales pendientes que aún no estén en remoto
    const remoteIds = new Set(remoteSales.map((r) => r.id));
    const localOnly = localCached.filter(
      (l) => l.id.startsWith("local-sale-") && !remoteIds.has(l.id)
    );
    const merged = [...localOnly, ...remoteSales].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    saveLocalSalesCache(merged);
    return buildSalesSummary(merged);
  } catch {
    return buildSalesSummary(localCached);
  }
}

/**
 * Consulta la función RPC / vista pública segura `get_public_business_sales`
 * que JAMÁS expone `amount_mxn` ni `notes`.
 */
export async function getPublicBusinessSales(
  businessId: string,
  limit = 15
): Promise<PublicBusinessSale[]> {
  const localForBiz = loadLocalSalesCache()
    .filter((s) => s.businessId === businessId)
    .map((s) => ({
      id: s.id,
      businessId: s.businessId,
      itemSummary: s.itemSummary,
      quantity: s.quantity,
      buyerConfirmed: s.buyerConfirmed,
      buyerConfirmedAt: s.buyerConfirmedAt,
      createdAt: s.createdAt,
      verificationLabel: s.buyerConfirmed
        ? "Confirmada por vecino"
        : "Registrada en puesto",
    }));

  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    businessId.startsWith("local-")
  ) {
    if (localForBiz.length === 0 && isDemoBusinessId(businessId)) {
      return getDemoPublicSalesForBusiness(businessId).slice(0, limit);
    }
    return localForBiz.slice(0, limit);
  }

  try {
    const { data, error } = await supabase.rpc("get_public_business_sales", {
      p_business_id: businessId,
      p_limit: limit,
    });

    if (!error && Array.isArray(data)) {
      const remoteList: PublicBusinessSale[] = data.map(
        (row: Record<string, unknown>) => ({
          id: String(row.id),
          businessId: String(row.business_id),
          itemSummary: String(row.item_summary),
          quantity: Number(row.quantity) || 1,
          buyerConfirmed: Boolean(row.buyer_confirmed),
          buyerConfirmedAt: row.buyer_confirmed_at
            ? String(row.buyer_confirmed_at)
            : null,
          createdAt: String(row.created_at),
          verificationLabel: String(
            row.verification_label ||
              (row.buyer_confirmed
                ? "Confirmada por vecino"
                : "Registrada en puesto")
          ),
        })
      );

      const remoteIds = new Set(remoteList.map((r) => r.id));
      const localUnsynced = localForBiz.filter((l) => !remoteIds.has(l.id));
      const combined = [...localUnsynced, ...remoteList];
      if (combined.length === 0 && isDemoBusinessId(businessId)) {
        return getDemoPublicSalesForBusiness(businessId).slice(0, limit);
      }
      return combined.slice(0, limit);
    }

    // Fallback a la vista pública segura `public_business_sales`
    const { data: viewData } = await supabase
      .from("public_business_sales")
      .select(
        "id, business_id, item_summary, quantity, buyer_confirmed, buyer_confirmed_at, created_at, verification_label"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (viewData) {
      return viewData.map((row) => ({
        id: String(row.id),
        businessId: String(row.business_id),
        itemSummary: String(row.item_summary),
        quantity: Number(row.quantity) || 1,
        buyerConfirmed: Boolean(row.buyer_confirmed),
        buyerConfirmedAt: row.buyer_confirmed_at
          ? String(row.buyer_confirmed_at)
          : null,
        createdAt: String(row.created_at),
        verificationLabel: String(
          row.verification_label ||
            (row.buyer_confirmed
              ? "Confirmada por vecino"
              : "Registrada en puesto")
        ),
      }));
    }
  } catch {
    // Fallback
  }

  if (localForBiz.length === 0 && isDemoBusinessId(businessId)) {
    return getDemoPublicSalesForBusiness(businessId).slice(0, limit);
  }
  return localForBiz.slice(0, limit);
}

/**
 * Obtiene las entregas vinculadas a una conversación activa para mostrar
 * la tarjeta de confirmación rápida en `LiveChatView`.
 */
export async function getConversationSales(
  conversationId: string,
  businessId?: string
): Promise<SellerSaleRecord[]> {
  const localMatches = loadLocalSalesCache().filter(
    (s) =>
      s.conversationId === conversationId ||
      (businessId && s.businessId === businessId && s.conversationId === conversationId)
  );

  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    conversationId.startsWith("conv-")
  ) {
    return localMatches;
  }

  try {
    const { data } = await supabase
      .from("sales")
      .select(
        "id, business_id, seller_id, buyer_id, conversation_id, item_summary, quantity, buyer_confirmed, buyer_confirmed_at, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data) return localMatches;

    const remote: SellerSaleRecord[] = data.map((row) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      businessName: "Entrega en chat",
      sellerId: String(row.seller_id),
      buyerId: row.buyer_id ? String(row.buyer_id) : null,
      conversationId: row.conversation_id ? String(row.conversation_id) : null,
      itemSummary: String(row.item_summary),
      quantity: Number(row.quantity) || 1,
      amountMxn: null,
      buyerConfirmed: Boolean(row.buyer_confirmed),
      buyerConfirmedAt: row.buyer_confirmed_at
        ? String(row.buyer_confirmed_at)
        : null,
      notes: null,
      createdAt: String(row.created_at),
    }));

    const remoteIds = new Set(remote.map((r) => r.id));
    return [
      ...localMatches.filter((l) => !remoteIds.has(l.id)),
      ...remote,
    ];
  } catch {
    return localMatches;
  }
}

/**
 * Permite al vendedor eliminar un registro de venta equivocado.
 */
export async function deleteSale(saleId: string): Promise<boolean> {
  const cached = loadLocalSalesCache().filter((s) => s.id !== saleId);
  saveLocalSalesCache(cached);

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !saleId.startsWith("local-sale-")
  ) {
    try {
      await supabase.from("sales").delete().eq("id", saleId);
    } catch {
      // Ignore offline
    }
  }

  return true;
}
