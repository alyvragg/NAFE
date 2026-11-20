import { supabase } from "@/lib/supabase";
import {
  DEFAULT_CENTER_COORDS,
  GeoCoordinates,
  applyPrivacyFuzzing,
  haversineDistanceKm,
  loadOfflineProducers,
  saveOfflineProducers,
  sortProducersByDistance,
} from "@/lib/nativeBridge";

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
  expiresAt?: string;
  distanceKm: number;
  meetingPoint: string;
  savingsTag: string;
  story: string;
  scheduleToday: string;
  whatsappContact: string;
  approxLat: number;
  approxLng: number;
  photos: string[];
  viewsToday: number;
  directInquiries: number;
  isUserPost?: boolean;
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
  if (
    Object.values(SLUG_TO_LABEL).includes(
      slug as Exclude<ProducerCategory, "Todo">
    )
  ) {
    return slug as Exclude<ProducerCategory, "Todo">;
  }
  return "Comida y Gastronomía";
}

export function categoryLabelToSlug(
  label: Exclude<ProducerCategory, "Todo">
): CategorySlug {
  return LABEL_TO_SLUG[label] || "comida";
}

export const INITIAL_MOCK_PRODUCERS: ProducerPost[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    slug: "queso-fresco-familia-morales",
    productTitle: "Queso fresco de rancho y requesón del día",
    producerName: "Familia Morales · Rancho San Isidro",
    category: "Comida y Gastronomía",
    categorySlug: "comida",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 18:00",
    distanceKm: 0.4,
    meetingPoint: "Zona Mercado Gómez Palacio / Kiosco Central",
    savingsTag: "Directo · Ahorras ~25%",
    story:
      "Ordeña limpia cada madrugada en el Valle del Guadiana. Cuajado artesanal en aro de madera sin conservadores ni féculas, entregado fresco en hielera sellada.",
    scheduleToday: "Hoy de 08:30 a 18:00 hrs",
    whatsappContact: "526181428910",
    approxLat: 24.0262,
    approxLng: -104.6685,
    photos: [
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 34,
    directInquiries: 9,
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    slug: "pan-lena-dona-carmen",
    productTitle: "Pan de agua en horno de leña y miel de mezquite",
    producerName: "Horno Tradicional · Doña Carmen",
    category: "Comida y Gastronomía",
    categorySlug: "comida",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 17:30",
    distanceKm: 0.7,
    meetingPoint: "Crucero Plazuela Baca Ortiz",
    savingsTag: "Recién horneado · Ahorras ~20%",
    story:
      "Masa madre fermentada lentamente y horneada en adobe con leña de encino recuperada, acompañada de frascos de miel cruda de mezquite sin filtrar.",
    scheduleToday: "Hoy de 08:00 a 17:30 hrs",
    whatsappContact: "526181983341",
    approxLat: 24.0289,
    approxLng: -104.6741,
    photos: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 47,
    directInquiries: 14,
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    slug: "tortillas-criollas-molino-san-juan",
    productTitle: "Tortillas de maíz criollo azul y conservas caseras",
    producerName: "Molino San Juan · Colectivo Milpa",
    category: "Comida y Gastronomía",
    categorySlug: "comida",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 16:30",
    distanceKm: 1.1,
    meetingPoint: "Tienda Embajadora Barrio de Analco",
    savingsTag: "Maíz nativo · Ahorras ~22%",
    story:
      "Nixtamal tradicional con cal de piedra y maíz criollo cultivado sin agroquímicos por familias campesinas de la sierra duranguense.",
    scheduleToday: "Hoy de 09:00 a 16:30 hrs",
    whatsappContact: "526183107724",
    approxLat: 24.0195,
    approxLng: -104.6698,
    photos: [
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 39,
    directInquiries: 11,
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    slug: "vivero-sierra-madre-suculentas",
    productTitle: "Árboles frutales injertados, pino local y suculentas",
    producerName: "Vivero Sierra Madre · Don Rogelio",
    category: "Plantas y Viveros",
    categorySlug: "plantas",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 19:00",
    distanceKm: 2.1,
    meetingPoint: "Explanada Parque Guadiana / Acceso Norte",
    savingsTag: "Cultivo aclimatado · Ahorras ~30%",
    story:
      "Plantas de ornato, suculentas, manzanos, duraznos y árboles nativos adaptados al clima y suelo de la región, criados con composta orgánica.",
    scheduleToday: "Hoy de 09:30 a 19:00 hrs",
    whatsappContact: "526182451120",
    approxLat: 24.0221,
    approxLng: -104.6872,
    photos: [
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 31,
    directInquiries: 8,
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    slug: "herbolaria-semillas-jardin-botanico",
    productTitle: "Herbolaria medicinal, lavanda, romero y semillas criollas",
    producerName: "Huerto Vivo · Colectivo Botánico",
    category: "Plantas y Viveros",
    categorySlug: "plantas",
    freshnessStatus: "on_request",
    freshnessLabel: "Bajo pedido · Por confirmar",
    distanceKm: 1.0,
    meetingPoint: "Kiosco Jardín de San Antonio",
    savingsTag: "Semilla libre de químicos",
    story:
      "Macetas aromáticas de cocina, plantas medicinales y sobres de semilla criolla lista para huertos urbanos y traspatio.",
    scheduleToday: "Entregas hoy de 11:00 a 18:00 hrs",
    whatsappContact: "526183901188",
    approxLat: 24.0315,
    approxLng: -104.6612,
    photos: [
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 24,
    directInquiries: 6,
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    slug: "cantera-labrada-nombre-de-dios",
    productTitle: "Cantera rosa y gris labrada a mano · Laja y adoquín",
    producerName: "Canteros Unidos · Maestro Aurelio",
    category: "Minería y Cantera",
    categorySlug: "mineria",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 18:30",
    distanceKm: 2.6,
    meetingPoint: "Crucero Salida a Mezquital / Parador Público",
    savingsTag: "Precio de banco · Ahorras ~35%",
    story:
      "Extracción y labrado artesanal de cantera: fuentes, columnas, pisos de laja natural, molcajetes de piedra volcánica y recubrimientos.",
    scheduleToday: "Muestras y pedidos hoy de 08:00 a 18:30 hrs",
    whatsappContact: "526185104432",
    approxLat: 24.0064,
    approxLng: -104.6425,
    photos: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 29,
    directInquiries: 7,
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    slug: "minerales-piedra-natural-cerro-mercado",
    productTitle: "Piedra de río seleccionada, grava decorativa y cuarzos locales",
    producerName: "Cooperativa Pétrea del Guadiana",
    category: "Minería y Cantera",
    categorySlug: "mineria",
    freshnessStatus: "on_request",
    freshnessLabel: "Bajo pedido · Por confirmar",
    distanceKm: 1.9,
    meetingPoint: "Plazoleta Estación Antigua Ferrocarril",
    savingsTag: "Trato directo sin flete revendido",
    story:
      "Materiales pétreos naturales para jardín, construcción tradicional y muestras minerales de hierro y cuarzo recolectadas legalmente.",
    scheduleToday: "Hoy de 09:00 a 17:00 hrs",
    whatsappContact: "526186219087",
    approxLat: 24.0398,
    approxLng: -104.6661,
    photos: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 18,
    directInquiries: 5,
  },
  {
    id: "11111111-1111-4111-8111-111111111108",
    slug: "huerta-organica-los-sauces",
    productTitle: "Canasta de hortalizas de estación y huevo de libre pastoreo",
    producerName: "Huerta Los Sauces · Familia Saucedo",
    category: "Campo y Huerta",
    categorySlug: "campo",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 17:30",
    distanceKm: 0.9,
    meetingPoint: "Glorieta Jardín Vizcaya",
    savingsTag: "Cero intermediarios · Ahorras ~28%",
    story:
      "Cosechamos acelga, rábano, calabacita, cilantro criollo y recolectamos huevo de rancho una hora antes de vernos en el punto público.",
    scheduleToday: "Entregas hoy 12:30 y 17:30 hrs",
    whatsappContact: "526184059182",
    approxLat: 24.0342,
    approxLng: -104.6491,
    photos: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1598965402089-897ce52e8355?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 41,
    directInquiries: 12,
  },
  {
    id: "11111111-1111-4111-8111-111111111109",
    slug: "manzana-frijol-sierra-canatlan",
    productTitle: "Manzana criolla de Canatlán, nuez y frijol pinto nuevo",
    producerName: "Productores del Valle · Don Hilario",
    category: "Campo y Huerta",
    categorySlug: "campo",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 18:00",
    distanceKm: 0.7,
    meetingPoint: "Explanada Mercado El Refugio",
    savingsTag: "Cosecha limpia · Ahorras ~30%",
    story:
      "Fruta recién traída de las huertas familiares de Canatlán y frijol pinto de temporal limpio, cribado a mano y sin intermediarios.",
    scheduleToday: "Hoy de 08:30 a 18:00 hrs",
    whatsappContact: "526187442310",
    approxLat: 24.0241,
    approxLng: -104.6579,
    photos: [
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 36,
    directInquiries: 10,
  },
  {
    id: "11111111-1111-4111-8111-111111111110",
    slug: "ceramica-barro-taller-sierra",
    productTitle: "Cazuelas y jarros de barro bruñido libres de plomo",
    producerName: "Taller Sierra · Maestro Mateo",
    category: "Artesanía y Talleres",
    categorySlug: "artesania",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 20:00",
    distanceKm: 1.8,
    meetingPoint: "Corredor Cultural Constitución",
    savingsTag: "Trato justo directo al artesano",
    story:
      "Barro recolectado localmente, moldeado a mano y horneado a baja temperatura con esmaltes minerales 100% libres de plomo.",
    scheduleToday: "Hoy de 11:00 a 20:00 hrs",
    whatsappContact: "526185126093",
    approxLat: 24.0273,
    approxLng: -104.6712,
    photos: [
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 27,
    directInquiries: 7,
  },
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "madera-tallada-talabarteria-durango",
    productTitle: "Bateas de madera de pino y talabartería tradicional",
    producerName: "Taller El Mezquite · Familia Reyes",
    category: "Artesanía y Talleres",
    categorySlug: "artesania",
    freshnessStatus: "on_request",
    freshnessLabel: "Bajo pedido · Por confirmar",
    distanceKm: 2.0,
    meetingPoint: "Plaza IV Centenario / Portal Sur",
    savingsTag: "Hecho a mano · Sin revendedores",
    story:
      "Utensilios de cocina tallados en madera certificada de la sierra duranguense y artículos de cuero curtido vegetalmente.",
    scheduleToday: "Hoy de 10:30 a 19:00 hrs",
    whatsappContact: "526188321944",
    approxLat: 24.0255,
    approxLng: -104.6725,
    photos: [
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 21,
    directInquiries: 5,
  },
  {
    id: "11111111-1111-4111-8111-111111111112",
    slug: "bordado-tepehuano-colectivo-flores",
    productTitle: "Bolsos, blusas y caminos de mesa con bordado tradicional",
    producerName: "Colectivo Textil O'dam · Maestra Elena",
    category: "Textiles y Moda Local",
    categorySlug: "textiles",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 19:00",
    distanceKm: 1.7,
    meetingPoint: "Plaza de Armas / Kiosco Central",
    savingsTag: "100% para la artesana",
    story:
      "Piezas únicas tejidas y bordadas en punto de cruz por mujeres artesanas del Mezquital, utilizando algodón natural e hilos de alta durabilidad.",
    scheduleToday: "Hoy de 10:00 a 19:00 hrs",
    whatsappContact: "526189045512",
    approxLat: 24.0247,
    approxLng: -104.6702,
    photos: [
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 33,
    directInquiries: 9,
  },
  {
    id: "11111111-1111-4111-8111-111111111113",
    slug: "lana-tejida-telar-pedal-guadiana",
    productTitle: "Gabanes, cobijas y prendas de lana en telar de pedal",
    producerName: "Telares del Valle · Don Sebastián",
    category: "Textiles y Moda Local",
    categorySlug: "textiles",
    freshnessStatus: "on_request",
    freshnessLabel: "Bajo pedido · Por confirmar",
    distanceKm: 2.5,
    meetingPoint: "Plazuela del Calvario",
    savingsTag: "Lana pura · Ahorras ~25%",
    story:
      "Tejidos abrigadores elaborados en telar de madera con lana lavada y teñida con tintes naturales de nogal, grana y cempasúchil.",
    scheduleToday: "Hoy de 11:00 a 18:30 hrs",
    whatsappContact: "526183347890",
    approxLat: 24.0278,
    approxLng: -104.6778,
    photos: [
      "https://images.unsplash.com/photo-1584992236310-6edddc08a327?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 20,
    directInquiries: 4,
  },
  {
    id: "11111111-1111-4111-8111-111111111114",
    slug: "carpinteria-restauracion-maestro-luis",
    productTitle: "Carpintería de barrio, afilado y restauración de muebles",
    producerName: "Oficios San José · Maestro Luis",
    category: "Servicios y Oficios",
    categorySlug: "servicios",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 18:30",
    distanceKm: 1.6,
    meetingPoint: "Punto Público Barrio de Tierra Blanca",
    savingsTag: "Presupuesto directo y honesto",
    story:
      "Reparación de sillas, puertas, mesas de madera maciza y afilado profesional de herramientas de cocina y jardín en el mismo día.",
    scheduleToday: "Atención hoy de 08:30 a 18:30 hrs",
    whatsappContact: "526184438291",
    approxLat: 24.0168,
    approxLng: -104.6645,
    photos: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 26,
    directInquiries: 8,
  },
  {
    id: "11111111-1111-4111-8111-111111111115",
    slug: "herreria-soldadura-reparacion-hogar",
    productTitle: "Herrería artística, soldadura móvil y arreglo de bicicletas",
    producerName: "Taller Forja Viva · Ing. Marcos",
    category: "Servicios y Oficios",
    categorySlug: "servicios",
    freshnessStatus: "confirmed",
    freshnessLabel: "Confirmado hoy · Vence 19:00",
    distanceKm: 1.0,
    meetingPoint: "Explanada Deportiva / Entrada Principal",
    savingsTag: "Servicio local garantizado",
    story:
      "Fabricación de maceteros en hierro forjado, ajustes de herrería doméstica y mantenimiento mecánico de bicicletas de trabajo.",
    scheduleToday: "Hoy de 09:00 a 19:00 hrs",
    whatsappContact: "526187712349",
    approxLat: 24.0361,
    approxLng: -104.6548,
    photos: [
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    ],
    viewsToday: 23,
    directInquiries: 6,
  },
];

const SAVED_PRODUCERS_KEY = "nafe_saved_producer_ids_v2";
const MY_POST_IDS_KEY = "nafe_my_published_ids_v1";

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

export async function anchorAndMeasureProducers(
  rawList: ProducerPost[],
  userCoords: GeoCoordinates,
  maxRadiusKm = 0
): Promise<ProducerPost[]> {
  const distFromDefaultBase = haversineDistanceKm(
    userCoords.lat,
    userCoords.lng,
    DEFAULT_CENTER_COORDS.lat,
    DEFAULT_CENTER_COORDS.lng
  );

  const shouldAnchorToUserCity = distFromDefaultBase > 25;

  const anchored = rawList.map((item) => {
    if (!shouldAnchorToUserCity || item.isUserPost) return item;
    const dLat = item.approxLat - DEFAULT_CENTER_COORDS.lat;
    const dLng = item.approxLng - DEFAULT_CENTER_COORDS.lng;
    if (Math.abs(dLat) > 0.15 || Math.abs(dLng) > 0.15) {
      return item;
    }
    return {
      ...item,
      approxLat: Number((userCoords.lat + dLat).toFixed(6)),
      approxLng: Number((userCoords.lng + dLng).toFixed(6)),
    };
  });

  return sortProducersByDistance(
    userCoords.lat,
    userCoords.lng,
    maxRadiusKm,
    anchored
  );
}

export async function fetchProducerPostsFromSupabaseOrCache(
  isOfflineSimulated: boolean,
  userCoords: GeoCoordinates = DEFAULT_CENTER_COORDS,
  maxRadiusKm = 0
): Promise<ProducerPost[]> {
  const cached =
    (await loadOfflineProducers<ProducerPost>()) ?? INITIAL_MOCK_PRODUCERS;

  if (
    isOfflineSimulated ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  ) {
    return anchorAndMeasureProducers(cached, userCoords, maxRadiusKm);
  }

  try {
    const { data, error } = await supabase
      .from("producers")
      .select(
        "id, owner_id, title, producer_name, category, description, public_meeting_point, schedule_today, savings_tag, approx_lat, approx_lng, status, expires_at, photos, whatsapp"
      )
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return anchorAndMeasureProducers(cached, userCoords, maxRadiusKm);
    }

    const myIds = new Set(loadMyPublishedIds());

    const mapped: ProducerPost[] = data.map((row) => {
      const catLabel = categorySlugToLabel(row.category);
      const isConfirmed = row.status === "confirmed_today";
      return {
        id: String(row.id),
        slug: `puesto-${row.id}`,
        ownerId: row.owner_id ?? null,
        productTitle: row.title,
        producerName: row.producer_name,
        category: catLabel,
        categorySlug: (row.category as CategorySlug) || "comida",
        freshnessStatus: isConfirmed ? "confirmed" : "on_request",
        freshnessLabel: isConfirmed
          ? "Confirmado hoy · Vigente 24h"
          : "Bajo pedido · Pausado",
        expiresAt: row.expires_at ?? undefined,
        distanceKm: 1.5,
        meetingPoint: row.public_meeting_point,
        savingsTag: row.savings_tag || "Trato directo sin comisiones",
        story: row.description,
        scheduleToday: row.schedule_today || "Hoy de 09:00 a 18:00 hrs",
        whatsappContact: row.whatsapp || "526181428910",
        approxLat: Number(row.approx_lat) || DEFAULT_CENTER_COORDS.lat,
        approxLng: Number(row.approx_lng) || DEFAULT_CENTER_COORDS.lng,
        photos:
          Array.isArray(row.photos) && row.photos.length > 0
            ? row.photos
            : [
                "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
              ],
        viewsToday: 28,
        directInquiries: 7,
        isUserPost: myIds.has(String(row.id)),
      };
    });

    await saveOfflineProducers(mapped);
    return anchorAndMeasureProducers(mapped, userCoords, maxRadiusKm);
  } catch {
    return anchorAndMeasureProducers(cached, userCoords, maxRadiusKm);
  }
}

export async function uploadProducerPhotoToSupabase(
  file: File
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `lote-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("producer-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) return null;

    const { data } = supabase.storage
      .from("producer-photos")
      .getPublicUrl(fileName);

    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function createNewHarvestPost(params: {
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
}): Promise<ProducerPost> {
  const baseCoords = params.userCoords || DEFAULT_CENTER_COORDS;
  // Privacidad física obligatoria (~300–500 m aleatorios)
  const fuzzed = applyPrivacyFuzzing(baseCoords);
  const distKm = haversineDistanceKm(
    baseCoords.lat,
    baseCoords.lng,
    fuzzed.lat,
    fuzzed.lng
  );
  const catSlug = categoryLabelToSlug(params.category);

  const photoList =
    params.photos && params.photos.length > 0
      ? params.photos
      : [
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
        ];

  const cleanDescription =
    params.description?.trim() ||
    `Lote publicado hoy directamente por ${params.producerName.trim()} en el radar comunitario. Punto de encuentro público acordado sin intermediarios.`;

  const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const newLocalPost: ProducerPost = {
    id: `local-${Date.now()}`,
    slug: `cosecha-${Date.now()}`,
    productTitle: params.productTitle.trim(),
    producerName: params.producerName.trim(),
    category: params.category,
    categorySlug: catSlug,
    freshnessStatus: "confirmed",
    freshnessLabel: `Confirmado hoy · Vence ${params.cutoffTime.trim()}`,
    expiresAt: expiresIso,
    distanceKm: Math.max(0.3, distKm),
    meetingPoint: params.meetingPoint.trim(),
    savingsTag: "Directo de hoy · Sin comisiones",
    story: cleanDescription,
    scheduleToday: `Disponible hoy hasta las ${params.cutoffTime.trim()} hrs`,
    whatsappContact:
      params.whatsappContact?.replace(/\D/g, "") || "526181428910",
    approxLat: fuzzed.lat,
    approxLng: fuzzed.lng,
    photos: photoList,
    viewsToday: 1,
    directInquiries: 0,
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

      const { data: inserted } = await supabase
        .from("producers")
        .insert({
          owner_id: user?.id ?? null,
          title: newLocalPost.productTitle,
          producer_name: newLocalPost.producerName,
          category: catSlug,
          description: newLocalPost.story,
          public_meeting_point: newLocalPost.meetingPoint,
          schedule_today: newLocalPost.scheduleToday,
          savings_tag: newLocalPost.savingsTag,
          approx_lat: fuzzed.lat,
          approx_lng: fuzzed.lng,
          status: "confirmed_today",
          expires_at: expiresIso,
          photos: photoList,
          whatsapp: newLocalPost.whatsappContact,
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        newLocalPost.id = String(inserted.id);
        newLocalPost.ownerId = user?.id ?? null;
      }
    } catch {
      // Guardado en caché local
    }
  }

  rememberMyPublishedId(newLocalPost.id);
  const current =
    (await loadOfflineProducers<ProducerPost>()) ?? INITIAL_MOCK_PRODUCERS;
  await saveOfflineProducers([newLocalPost, ...current]);
  return newLocalPost;
}

export async function renewProducerPost24h(postId: string): Promise<void> {
  const nextExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  if (typeof navigator !== "undefined" && navigator.onLine && !postId.startsWith("local-")) {
    try {
      await supabase
        .from("producers")
        .update({
          status: "confirmed_today",
          expires_at: nextExpiry,
        })
        .eq("id", postId);
    } catch {
      // Ignore offline
    }
  }
}

export async function toggleProducerPostStatus(
  postId: string,
  nextStatus: FreshnessStatus
): Promise<void> {
  const dbStatus = nextStatus === "confirmed" ? "confirmed_today" : "on_demand";
  if (typeof navigator !== "undefined" && navigator.onLine && !postId.startsWith("local-")) {
    try {
      await supabase
        .from("producers")
        .update({ status: dbStatus })
        .eq("id", postId);
    } catch {
      // Ignore offline
    }
  }
}

export async function deleteProducerPost(postId: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine && !postId.startsWith("local-")) {
    try {
      await supabase.from("producers").delete().eq("id", postId);
    } catch {
      // Ignore offline
    }
  }
}

export function loadSavedProducerIds(): string[] {
  if (typeof window === "undefined") {
    return [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111104",
    ];
  }
  try {
    const raw = window.localStorage.getItem(SAVED_PRODUCERS_KEY);
    if (!raw) {
      return [
        "11111111-1111-4111-8111-111111111101",
        "11111111-1111-4111-8111-111111111104",
      ];
    }
    return JSON.parse(raw) as string[];
  } catch {
    return [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111104",
    ];
  }
}

export function saveSavedProducerIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_PRODUCERS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore
  }
}
