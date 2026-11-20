"use client";

import { supabase } from "./supabase";
import {
  isTauriEnvironment,
  triggerNativeStockNotification,
} from "./nativeBridge";

export interface FavoriteStockAlert {
  id: string;
  businessId: string;
  title: string;
  body: string;
  createdAt: string;
}

const RECENT_ALERT_TTL_MS = 10_000;
const recentAlertTimestamps = new Map<string, number>();

function isDuplicateAlert(businessId: string): boolean {
  const prev = recentAlertTimestamps.get(businessId);
  const now = Date.now();
  if (prev && now - prev < RECENT_ALERT_TTL_MS) {
    return true;
  }
  recentAlertTimestamps.set(businessId, now);
  return false;
}

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export async function getStockAlertPermissionStatus(): Promise<NotificationPermissionState> {
  if (isTauriEnvironment()) {
    try {
      const notifPlugin = await import("@tauri-apps/plugin-notification");
      const granted = await notifPlugin.isPermissionGranted();
      return granted ? "granted" : "default";
    } catch {
      return "default";
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Solicita permiso real de notificaciones (Android Tauri v2 POST_NOTIFICATIONS o Web Notification API).
 */
export async function requestStockAlertPermission(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const notifPlugin = await import("@tauri-apps/plugin-notification");
      let granted = await notifPlugin.isPermissionGranted();
      if (!granted) {
        const perm = await notifPlugin.requestPermission();
        granted = perm === "granted";
      }
      return granted;
    } catch {
      // Continuar al respaldo Web Notification
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

/**
 * Emite una alerta de stock tanto nativa (Tauri / Web Notification) como en la app.
 */
export async function dispatchFavoriteStockAlert(params: {
  businessId: string;
  businessName: string;
  producerName: string;
  meetingPoint?: string;
  onAlert?: (alert: FavoriteStockAlert) => void;
}): Promise<FavoriteStockAlert | null> {
  if (isDuplicateAlert(params.businessId)) return null;

  const title = `Stock disponible · ${params.producerName}`;
  const locationPart = params.meetingPoint ? ` en ${params.meetingPoint}` : "";
  const body = `"${params.businessName}" acaba de marcar stock disponible${locationPart}.`;

  const alert: FavoriteStockAlert = {
    id: `fav-stock-${params.businessId}-${Date.now()}`,
    businessId: params.businessId,
    title,
    body,
    createdAt: new Date().toISOString(),
  };

  params.onAlert?.(alert);
  await triggerNativeStockNotification(title, body);

  // Persistir en public.notifications si hay sesión activa
  if (typeof navigator !== "undefined" && navigator.onLine && !params.businessId.startsWith("local-")) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          business_id: params.businessId,
          title,
          body,
          is_read: false,
        });
      }
    } catch {
      // Ignorar si no hay red o RLS bloquea
    }
  }

  return alert;
}

/**
 * Servicio en tiempo real que escucha cambios de `is_in_stock` / `stock_updated_at`
 * en `public.businesses` y notifica inmediatamente si el negocio está en favoritos del usuario.
 */
export function subscribeToFavoriteStockAlerts(params: {
  getSavedIds: () => string[];
  onAlert: (alert: FavoriteStockAlert) => void;
}): () => void {
  const channel = supabase
    .channel("nafe-favorite-stock-watcher")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "businesses",
      },
      (payload) => {
        const nextRow = payload.new as Record<string, unknown> | null;
        const oldRow = payload.old as Record<string, unknown> | null;
        if (!nextRow?.id) return;

        const businessId = String(nextRow.id);
        const savedIds = params.getSavedIds();
        if (!savedIds.includes(businessId)) return;

        const isNowInStock = Boolean(nextRow.is_in_stock);
        const wasInStock = oldRow ? Boolean(oldRow.is_in_stock) : false;
        const stockTimestampChanged =
          Boolean(nextRow.stock_updated_at) &&
          nextRow.stock_updated_at !== oldRow?.stock_updated_at;

        if (isNowInStock && (!wasInStock || stockTimestampChanged)) {
          void dispatchFavoriteStockAlert({
            businessId,
            businessName: String(nextRow.name || "Producto local"),
            producerName: String(nextRow.producer_name || "Productor favorito"),
            meetingPoint: nextRow.public_meeting_point
              ? String(nextRow.public_meeting_point)
              : undefined,
            onAlert: params.onAlert,
          });
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
