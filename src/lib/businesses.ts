"use client";

import { supabase } from "./supabase";
import {
  DEFAULT_CENTER_COORDS,
  GeoCoordinates,
  fuzzCoordinates,
  haversineDistanceKm,
  loadOfflineBusinesses,
  saveOfflineBusinesses,
  sortBusinessesByDistance,
} from "./nativeBridge";
import { SubscriptionTier } from "@/components/auth/validators";
import {
  anchorDemoBusinessesAroundCoords,
  buildNearbyDemoBusinesses,
  getDemoReviewsForBusiness,
  isDemoBusinessId,
} from "./demoBusinesses";

export type ProducerCategory =
  | "Todo"
  | "Comida y Gastronomía"
  | "Plantas y Viveros"
  | "Minería y Cantera"
  | "Campo y Huerta"
  | "Artesanía y Talleres"
  | "Textiles y Moda Local"
  | "Servicios y Oficios";

export type CategorySlug =
  | "comida"
  | "plantas"
  | "mineria"
  | "campo"
  | "artesania"
  | "textiles"
  | "servicios";

export type FreshnessStatus = "confirmed" | "on_request";

export interface ProducerPost {
  id: string;
  slug: string;
  ownerId?: string | null;
  productTitle: string;
  producerName: string;
  category: Exclude<ProducerCategory, "Todo">;
  categorySlug: CategorySlug;
  freshnessStatus: FreshnessStatus;
  freshnessLabel: string;
  isInStock: boolean;
  expiresAt?: string;
  distanceKm: number;
  meetingPoint: string;
  story: string;
  scheduleToday: string;
  whatsappContact: string;
  approxLat: number;
  approxLng: number;
  photos: string[];
  avgRating: number;
  reviewsCount: number;
  completedSalesCount: number;
  verifiedSalesCount: number;
  isUserPost?: boolean;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  businessId?: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  businessId?: string;
  businessName: string;
  producerName: string;
  buyerId?: string | null;
  sellerId?: string | null;
  lastMessage: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderName: string;
  isFromSeller: boolean;
  body: string;
  createdAt: string;
}

export const PRODUCER_CATEGORIES: ProducerCategory[] = [
  "Todo",
  "Comida y Gastronomía",
  "Plantas y Viveros",
  "Minería y Cantera",
  "Campo y Huerta",
  "Artesanía y Talleres",
  "Textiles y Moda Local",
  "Servicios y Oficios",
];

const SLUG_TO_LABEL: Record<
  CategorySlug,
  Exclude<ProducerCategory, "Todo">
> = {
  comida: "Comida y Gastronomía",
  plantas: "Plantas y Viveros",
  mineria: "Minería y Cantera",
  campo: "Campo y Huerta",
  artesania: "Artesanía y Talleres",
  textiles: "Textiles y Moda Local",
  servicios: "Servicios y Oficios",
};

const LABEL_TO_SLUG: Record<
  Exclude<ProducerCategory, "Todo">,
  CategorySlug
> = {
  "Comida y Gastronomía": "comida",
  "Plantas y Viveros": "plantas",
  "Minería y Cantera": "mineria",
  "Campo y Huerta": "campo",
  "Artesanía y Talleres": "artesania",
  "Textiles y Moda Local": "textiles",
  "Servicios y Oficios": "servicios",
};

export function categorySlugToLabel(
  slug: string
): Exclude<ProducerCategory, "Todo"> {
  if (slug in SLUG_TO_LABEL) {
    return SLUG_TO_LABEL[slug as CategorySlug];
  }
  return "Comida y Gastronomía";
}

export function categoryLabelToSlug(
  label: Exclude<ProducerCategory, "Todo">
): CategorySlug {
  return LABEL_TO_SLUG[label] || "comida";
}

const SAVED_PRODUCERS_KEY = "nafe_saved_business_ids_v1";
const MY_POST_IDS_KEY = "nafe_my_business_ids_v1";

export function loadMyPublishedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_POST_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberMyPublishedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadMyPublishedIds();
    if (!current.includes(id)) {
      window.localStorage.setItem(
        MY_POST_IDS_KEY,
        JSON.stringify([id, ...current])
      );
    }
  } catch {
    // Ignore
  }
}

export async function anchorAndMeasureBusinesses(
  rawList: ProducerPost[],
  userCoords: GeoCoordinates,
  maxRadiusKm = 0,
  cityLabel?: string
): Promise<ProducerPost[]> {
  const effectiveList =
    rawList.length > 0
      ? rawList
      : buildNearbyDemoBusinesses(userCoords, cityLabel);

  const anchored = anchorDemoBusinessesAroundCoords(
    effectiveList,
    userCoords,
    cityLabel
  );

  return sortBusinessesByDistance(
    userCoords.lat,
    userCoords.lng,
    maxRadiusKm,
    anchored
  );
}

/**
 * Consulta 100% real a `public.businesses` en Supabase (con respaldo a caché Rust/localStorage
 * y negocios de prueba cercanos a la ubicación actual si aún no hay registros locales).
 */
export async function fetchBusinessesFromSupabase(
  isOfflineSimulated: boolean,
  userCoords: GeoCoordinates = DEFAULT_CENTER_COORDS,
  maxRadiusKm = 0,
  cityLabel?: string
): Promise<ProducerPost[]> {
  const cached = (await loadOfflineBusinesses<ProducerPost>()) ?? [];

  if (isOfflineSimulated) {
    return anchorAndMeasureBusinesses(cached, userCoords, maxRadiusKm, cityLabel);
  }

  try {
    const queryPromise = supabase
      .from("businesses")
      .select(
        "id, owner_id, name, producer_name, category, description, public_meeting_point, schedule_today, approx_lat, approx_lng, whatsapp, is_in_stock, expires_at, photos, avg_rating, reviews_count, completed_sales_count, verified_sales_count"
      )
      .order("created_at", { ascending: false });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error("Supabase timeout") }),
        6000
      )
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error || !data) {
      return anchorAndMeasureBusinesses(cached, userCoords, maxRadiusKm, cityLabel);
    }

    const myIds = new Set(loadMyPublishedIds());

    const mapped: ProducerPost[] = data.map((row) => {
      const catLabel = categorySlugToLabel(row.category);
      const inStock = Boolean(row.is_in_stock);
      return {
        id: String(row.id),
        slug: `negocio-${row.id}`,
        ownerId: row.owner_id ?? null,
        productTitle: row.name,
        producerName: row.producer_name || "Productor Local",
        category: catLabel,
        categorySlug: (row.category as CategorySlug) || "comida",
        freshnessStatus: inStock ? "confirmed" : "on_request",
        freshnessLabel: inStock ? "Disponible hoy" : "Bajo pedido",
        isInStock: inStock,
        expiresAt: row.expires_at ?? undefined,
        distanceKm: 1.2,
        meetingPoint: row.public_meeting_point,
        story: row.description,
        scheduleToday: row.schedule_today || "Hoy de 09:00 a 18:00 hrs",
        whatsappContact: row.whatsapp || "526181428910",
        approxLat: Number(row.approx_lat) || DEFAULT_CENTER_COORDS.lat,
        approxLng: Number(row.approx_lng) || DEFAULT_CENTER_COORDS.lng,
        photos: Array.isArray(row.photos) ? row.photos.filter(Boolean) : [],
        avgRating: Number(row.avg_rating) || 0,
        reviewsCount: Number(row.reviews_count) || 0,
        completedSalesCount: Number(row.completed_sales_count) || 0,
        verifiedSalesCount: Number(row.verified_sales_count) || 0,
        isUserPost: myIds.has(String(row.id)),
      };
    });

    await saveOfflineBusinesses(mapped);
    return anchorAndMeasureBusinesses(mapped, userCoords, maxRadiusKm, cityLabel);
  } catch {
    return anchorAndMeasureBusinesses(cached, userCoords, maxRadiusKm, cityLabel);
  }
}

export function checkBusinessLimitAllowed(
  currentOwnedCount: number,
  tier: SubscriptionTier = "free"
): { allowed: boolean; maxAllowed: number } {
  if (tier === "coop") return { allowed: true, maxAllowed: 999 };
  if (tier === "pro") return { allowed: currentOwnedCount < 5, maxAllowed: 5 };
  return { allowed: currentOwnedCount < 1, maxAllowed: 1 };
}

export async function createNewBusinessInSupabase(params: {
  producerName: string;
  productTitle: string;
  category: Exclude<ProducerCategory, "Todo">;
  description?: string;
  meetingPoint: string;
  cutoffTime: string;
  whatsappContact?: string;
  photos?: string[];
  userCoords?: GeoCoordinates;
  isOfflineSimulated?: boolean;
  stockDurationHours?: number;
}): Promise<{ ok: boolean; post?: ProducerPost; subscriptionRequired?: boolean; error?: string }> {
  const baseCoords = params.userCoords || DEFAULT_CENTER_COORDS;
  const fuzzed = fuzzCoordinates(baseCoords.lat, baseCoords.lng);
  const distKm = haversineDistanceKm(
    baseCoords.lat,
    baseCoords.lng,
    fuzzed.lat,
    fuzzed.lng
  );
  const catSlug = categoryLabelToSlug(params.category);
  const photoList = (params.photos ?? []).filter(Boolean);
  const durationHours = Math.max(24, params.stockDurationHours ?? 24);
  const expiresIso = new Date(
    Date.now() + durationHours * 60 * 60 * 1000
  ).toISOString();

  const cleanDescription =
    params.description?.trim() ||
    `Producción local de ${params.producerName.trim()} disponible en punto público seguro.`;

  const draftPost: ProducerPost = {
    id: `local-${Date.now()}`,
    slug: `negocio-${Date.now()}`,
    productTitle: params.productTitle.trim(),
    producerName: params.producerName.trim(),
    category: params.category,
    categorySlug: catSlug,
    freshnessStatus: "confirmed",
    freshnessLabel: "Disponible hoy",
    isInStock: true,
    expiresAt: expiresIso,
    distanceKm: Math.max(0.2, distKm),
    meetingPoint: params.meetingPoint.trim(),
    story: cleanDescription,
    scheduleToday: `Disponible hoy hasta las ${params.cutoffTime.trim()} hrs`,
    whatsappContact:
      params.whatsappContact?.replace(/\D/g, "") || "526181428910",
    approxLat: fuzzed.lat,
    approxLng: fuzzed.lng,
    photos: photoList,
    avgRating: 5.0,
    reviewsCount: 1,
    completedSalesCount: 0,
    verifiedSalesCount: 0,
    isUserPost: true,
  };

  if (
    !params.isOfflineSimulated &&
    typeof navigator !== "undefined" &&
    navigator.onLine
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: inserted, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: user?.id ?? null,
          name: draftPost.productTitle,
          producer_name: draftPost.producerName,
          category: catSlug,
          description: draftPost.story,
          public_meeting_point: draftPost.meetingPoint,
          schedule_today: draftPost.scheduleToday,
          approx_lat: fuzzed.lat,
          approx_lng: fuzzed.lng,
          whatsapp: draftPost.whatsappContact,
          is_in_stock: true,
          expires_at: expiresIso,
          photos: photoList,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        if (error.message.includes("SUBSCRIPTION_REQUIRED")) {
          return {
            ok: false,
            subscriptionRequired: true,
            error: error.message,
          };
        }
        return { ok: false, error: error.message };
      }

      if (inserted?.id) {
        draftPost.id = String(inserted.id);
        draftPost.ownerId = user?.id ?? null;
      }
    } catch {
      // Guardado local cuando no hay red
    }
  }

  rememberMyPublishedId(draftPost.id);
  const current = (await loadOfflineBusinesses<ProducerPost>()) ?? [];
  await saveOfflineBusinesses([draftPost, ...current]);
  return { ok: true, post: draftPost };
}

export async function renewBusinessStock24h(
  businessId: string,
  durationHours = 24
): Promise<void> {
  const nowIso = new Date().toISOString();
  const nextExpiry = new Date(
    Date.now() + Math.max(24, durationHours) * 60 * 60 * 1000
  ).toISOString();
  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !businessId.startsWith("local-")
  ) {
    try {
      await supabase
        .from("businesses")
        .update({
          is_in_stock: true,
          stock_updated_at: nowIso,
          expires_at: nextExpiry,
        })
        .eq("id", businessId);
    } catch {
      // Ignore offline
    }
  }
}

export async function toggleBusinessStockStatus(
  businessId: string,
  nextInStock: boolean
): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !businessId.startsWith("local-")
  ) {
    try {
      await supabase
        .from("businesses")
        .update({
          is_in_stock: nextInStock,
          stock_updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);
    } catch {
      // Ignore offline
    }
  }
}

export async function deleteBusinessFromSupabase(
  businessId: string
): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !businessId.startsWith("local-")
  ) {
    try {
      await supabase.from("businesses").delete().eq("id", businessId);
    } catch {
      // Ignore offline
    }
  }
}

// ============================================================================
// SISTEMA DE ESTRELLAS Y RESEÑAS (public.reviews)
// ============================================================================
export async function fetchBusinessReviews(
  businessId: string
): Promise<BusinessReview[]> {
  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    businessId.startsWith("local-")
  ) {
    return isDemoBusinessId(businessId)
      ? getDemoReviewsForBusiness(businessId)
      : [];
  }

  try {
    const { data } = await supabase
      .from("reviews")
      .select("id, business_id, reviewer_name, rating, comment, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data || data.length === 0) {
      return isDemoBusinessId(businessId)
        ? getDemoReviewsForBusiness(businessId)
        : [];
    }
    return data.map((r) => ({
      id: String(r.id),
      businessId: String(r.business_id),
      reviewerName: r.reviewer_name || "Vecino",
      rating: Number(r.rating) || 5,
      comment: r.comment || "",
      createdAt: r.created_at,
    }));
  } catch {
    return isDemoBusinessId(businessId)
      ? getDemoReviewsForBusiness(businessId)
      : [];
  }
}

export async function submitBusinessReview(params: {
  businessId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}): Promise<BusinessReview | null> {
  const newReview: BusinessReview = {
    id: `rev-${Date.now()}`,
    businessId: params.businessId,
    reviewerName: params.reviewerName.trim() || "Vecino",
    rating: Math.min(5, Math.max(1, params.rating)),
    comment: params.comment.trim(),
    createdAt: new Date().toISOString(),
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

      const { data } = await supabase
        .from("reviews")
        .insert({
          business_id: params.businessId,
          reviewer_id: user?.id ?? null,
          reviewer_name: newReview.reviewerName,
          rating: newReview.rating,
          comment: newReview.comment,
        })
        .select("id, created_at")
        .maybeSingle();

      if (data?.id) {
        newReview.id = String(data.id);
        newReview.createdAt = data.created_at;
      }
    } catch {
      // Ignore
    }
  }

  return newReview;
}

// ============================================================================
// SISTEMA DE CHATS EN VIVO (public.conversations y public.messages)
// ============================================================================
export async function getOrCreateConversation(params: {
  businessId: string;
  businessName: string;
  producerName: string;
}): Promise<ChatConversation> {
  const fallbackConv: ChatConversation = {
    id: `conv-${params.businessId}`,
    businessId: params.businessId,
    businessName: params.businessName,
    producerName: params.producerName,
    lastMessage: "",
    lastMessageAt: new Date().toISOString(),
  };

  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    params.businessId.startsWith("local-")
  ) {
    return fallbackConv;
  }

  try {
    const { data: existing } = await supabase
      .from("conversations")
      .select(
        "id, business_id, business_name, producer_name, buyer_id, seller_id, last_message, last_message_at"
      )
      .eq("business_id", params.businessId)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        id: String(existing.id),
        businessId: String(existing.business_id),
        businessName: existing.business_name,
        producerName: existing.producer_name,
        buyerId: existing.buyer_id ?? null,
        sellerId: existing.seller_id ?? null,
        lastMessage: existing.last_message || "",
        lastMessageAt: existing.last_message_at,
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: bizRow } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", params.businessId)
      .maybeSingle();

    const { data: created } = await supabase
      .from("conversations")
      .insert({
        business_id: params.businessId,
        business_name: params.businessName,
        producer_name: params.producerName,
        buyer_id: user?.id ?? null,
        seller_id: bizRow?.owner_id ?? null,
        last_message: "Conversación iniciada",
      })
      .select(
        "id, business_id, business_name, producer_name, buyer_id, seller_id, last_message, last_message_at"
      )
      .maybeSingle();

    if (created) {
      return {
        id: String(created.id),
        businessId: String(created.business_id),
        businessName: created.business_name,
        producerName: created.producer_name,
        buyerId: created.buyer_id ?? null,
        sellerId: created.seller_id ?? null,
        lastMessage: created.last_message || "",
        lastMessageAt: created.last_message_at,
      };
    }
  } catch {
    // Fallback
  }

  return fallbackConv;
}

export async function fetchAllConversations(): Promise<ChatConversation[]> {
  if (typeof navigator === "undefined" || !navigator.onLine) return [];
  try {
    const { data } = await supabase
      .from("conversations")
      .select(
        "id, business_id, business_name, producer_name, buyer_id, seller_id, last_message, last_message_at"
      )
      .order("last_message_at", { ascending: false })
      .limit(30);

    if (!data) return [];
    return data.map((c) => ({
      id: String(c.id),
      businessId: c.business_id ? String(c.business_id) : undefined,
      businessName: c.business_name,
      producerName: c.producer_name,
      buyerId: c.buyer_id ?? null,
      sellerId: c.seller_id ?? null,
      lastMessage: c.last_message || "",
      lastMessageAt: c.last_message_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  if (
    typeof navigator === "undefined" ||
    !navigator.onLine ||
    conversationId.startsWith("conv-")
  ) {
    return [];
  }

  try {
    const { data } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_name, is_from_seller, body, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!data) return [];
    return data.map((m) => ({
      id: String(m.id),
      conversationId: String(m.conversation_id),
      senderName: m.sender_name || "Vecino",
      isFromSeller: Boolean(m.is_from_seller),
      body: m.body,
      createdAt: m.created_at,
    }));
  } catch {
    return [];
  }
}

export async function sendChatMessage(params: {
  conversationId: string;
  senderName: string;
  body: string;
  isFromSeller?: boolean;
}): Promise<ChatMessage> {
  const localMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversationId: params.conversationId,
    senderName: params.senderName.trim() || "Vecino",
    isFromSeller: Boolean(params.isFromSeller),
    body: params.body.trim(),
    createdAt: new Date().toISOString(),
  };

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !params.conversationId.startsWith("conv-")
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("messages")
        .insert({
          conversation_id: params.conversationId,
          sender_id: user?.id ?? null,
          sender_name: localMsg.senderName,
          is_from_seller: localMsg.isFromSeller,
          body: localMsg.body,
        })
        .select("id, created_at")
        .maybeSingle();

      if (data?.id) {
        localMsg.id = String(data.id);
        localMsg.createdAt = data.created_at;
      }
    } catch {
      // Ignore
    }
  }

  return localMsg;
}

// ============================================================================
// FAVORITOS Y NOTIFICACIONES DE STOCK
// ============================================================================
export function loadSavedBusinessIds(): string[] {
  if (typeof window === "undefined") {
    return ["22222222-2222-4222-8222-222222222201"];
  }
  try {
    const raw = window.localStorage.getItem(SAVED_PRODUCERS_KEY);
    if (!raw) {
      return ["22222222-2222-4222-8222-222222222201"];
    }
    return JSON.parse(raw) as string[];
  } catch {
    return ["22222222-2222-4222-8222-222222222201"];
  }
}

export async function toggleSavedBusinessId(
  businessId: string,
  currentIds: string[]
): Promise<string[]> {
  const isAlreadySaved = currentIds.includes(businessId);
  const nextIds = isAlreadySaved
    ? currentIds.filter((id) => id !== businessId)
    : [...currentIds, businessId];

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SAVED_PRODUCERS_KEY, JSON.stringify(nextIds));
    } catch {
      // Ignore
    }
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine &&
    !businessId.startsWith("local-")
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (isAlreadySaved) {
          await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("business_id", businessId);
        } else {
          await supabase.from("favorites").upsert({
            user_id: user.id,
            business_id: businessId,
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  return nextIds;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (typeof navigator === "undefined" || !navigator.onLine) return [];
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let query = supabase
      .from("notifications")
      .select("id, business_id, title, body, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (user?.id) {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    if (!data) return [];
    return data.map((row) => ({
      id: String(row.id),
      businessId: row.business_id ? String(row.business_id) : undefined,
      title: String(row.title || "Novedad en tu radar"),
      body: String(row.body || ""),
      isRead: Boolean(row.is_read),
      createdAt: String(row.created_at),
    }));
  } catch {
    return [];
  }
}

export async function markNotificationsRead(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }
  } catch {
    // Ignore
  }
}
