"use client";

import type { SubscriptionTier } from "@/components/auth/validators";

export interface PlanPerkRow {
  label: string;
  value: string;
}

export interface PlanConfig {
  id: SubscriptionTier;
  name: string;
  priceLabel: string;
  periodLabel: string;
  shortSubtitle: string;
  maxBusinesses: number;
  maxPhotos: number;
  stockDurationHours: number;
  stockRenewLabel: string;
  stockRenewedMessage: string;
  trustBadgeLabel: string;
  radarPriority: 0 | 1 | 2;
  hasHighlightedPin: boolean;
  hasAdvancedStats: boolean;
  hasCsvExport: boolean;
  hasMonthlyReport: boolean;
  perks: PlanPerkRow[];
}

export const PLAN_CONFIGS: Record<SubscriptionTier, PlanConfig> = {
  free: {
    id: "free",
    name: "Plan Semilla",
    priceLabel: "$0",
    periodLabel: "Gratis",
    shortSubtitle: "Para empezar con 1 negocio local",
    maxBusinesses: 1,
    maxPhotos: 3,
    stockDurationHours: 24,
    stockRenewLabel: "Renovar 24h",
    stockRenewedMessage: "Stock confirmado por 24 horas",
    trustBadgeLabel: "Verificación básica",
    radarPriority: 0,
    hasHighlightedPin: false,
    hasAdvancedStats: false,
    hasCsvExport: false,
    hasMonthlyReport: false,
    perks: [
      { label: "Negocios o puestos activos", value: "1 negocio" },
      { label: "Fotos por publicación", value: "Hasta 3 fotos" },
      {
        label: "Duración de disponibilidad",
        value: "Lote activo por 24 horas (requiere renovar diario)",
      },
      {
        label: "Visibilidad en el Radar y Mapa",
        value: "Posición estándar por cercanía",
      },
      { label: "Insignia de confianza", value: "Verificación básica" },
      {
        label: "Panel de Ventas e Historial",
        value: "Registro básico de entregas",
      },
    ],
  },
  pro: {
    id: "pro",
    name: "Plan Cosecha",
    priceLabel: "$99",
    periodLabel: "MXN / mes",
    shortSubtitle: "Ideal para productores activos y varios giros",
    maxBusinesses: 5,
    maxPhotos: 6,
    stockDurationHours: 24 * 7,
    stockRenewLabel: "Renovar 7 días",
    stockRenewedMessage: "Lote activo por 7 días (renovación con 1 toque)",
    trustBadgeLabel: "Productor Verificado",
    radarPriority: 1,
    hasHighlightedPin: false,
    hasAdvancedStats: true,
    hasCsvExport: true,
    hasMonthlyReport: false,
    perks: [
      {
        label: "Negocios o puestos activos",
        value: "Hasta 5 negocios (o distintos giros/puntos de entrega)",
      },
      { label: "Fotos por publicación", value: "Hasta 6 fotos por puesto" },
      {
        label: "Duración de disponibilidad",
        value: "Lote activo hasta 7 días o renovación rápida con 1 toque",
      },
      {
        label: "Visibilidad en el Radar y Mapa",
        value: "Prioridad media en búsquedas locales de su categoría",
      },
      {
        label: "Insignia de confianza",
        value: 'Insignia "Productor Verificado" prioritaria',
      },
      {
        label: "Panel de Ventas e Historial",
        value:
          "Estadísticas de ventas (comparativa semanal, productos más pedidos) + exportación a Excel/CSV",
      },
    ],
  },
  coop: {
    id: "coop",
    name: "Plan Cooperativa",
    priceLabel: "$250",
    periodLabel: "MXN / mes",
    shortSubtitle: "Máxima visibilidad, puestos ilimitados y reportes",
    maxBusinesses: 999,
    maxPhotos: 10,
    stockDurationHours: 24 * 30,
    stockRenewLabel: "Disponibilidad permanente",
    stockRenewedMessage: "Disponibilidad permanente / programada activa",
    trustBadgeLabel: "Cooperativa / Productor Oficial",
    radarPriority: 2,
    hasHighlightedPin: true,
    hasAdvancedStats: true,
    hasCsvExport: true,
    hasMonthlyReport: true,
    perks: [
      { label: "Negocios o puestos activos", value: "Negocios ilimitados" },
      {
        label: "Fotos por publicación",
        value: "Galería completa (hasta 10 fotos)",
      },
      {
        label: "Duración de disponibilidad",
        value: "Disponibilidad permanente / programada por días de la semana",
      },
      {
        label: "Visibilidad en el Radar y Mapa",
        value:
          "Pin destacado en el mapa y aparición en los primeros lugares del radar",
      },
      {
        label: "Insignia de confianza",
        value:
          'Insignia "Cooperativa / Productor Oficial" + sello de antigüedad',
      },
      {
        label: "Panel de Ventas e Historial",
        value:
          "Métricas multi-puesto y reporte mensual descargable para control interno",
      },
    ],
  },
};

export const PLAN_LIST: PlanConfig[] = [
  PLAN_CONFIGS.free,
  PLAN_CONFIGS.pro,
  PLAN_CONFIGS.coop,
];

export function getPlanConfig(tier?: SubscriptionTier | null): PlanConfig {
  if (tier && tier in PLAN_CONFIGS) {
    return PLAN_CONFIGS[tier];
  }
  return PLAN_CONFIGS.free;
}
