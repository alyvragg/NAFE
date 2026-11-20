"use client";

import type {
  ProducerPost,
  BusinessReview,
  CategorySlug,
  ProducerCategory,
} from "./businesses";
import type { PublicBusinessSale } from "./sales";
import type { GeoCoordinates } from "./nativeBridge";

export const DEMO_BUSINESS_PREFIX = "22222222-2222-4222-8222-";

export function isDemoBusinessId(id?: string | null): boolean {
  return Boolean(id && id.startsWith(DEMO_BUSINESS_PREFIX));
}

const CDN_BASE =
  "https://widycevcjjruphtbkuqp.supabase.co/storage/v1/object/public/product-photos/catalog";

interface DemoBusinessSeed {
  id: string;
  productTitle: string;
  producerName: string;
  category: Exclude<ProducerCategory, "Todo">;
  categorySlug: CategorySlug;
  isInStock: boolean;
  meetingPointBase: string;
  story: string;
  scheduleToday: string;
  whatsappContact: string;
  photo: string;
  avgRating: number;
  reviewsCount: number;
  completedSalesCount: number;
  verifiedSalesCount: number;
  /** Desplazamiento determinista en grados respecto a la ubicación real del usuario (~0.35 km – 3.4 km) */
  dLat: number;
  dLng: number;
}

const DEMO_SEEDS: DemoBusinessSeed[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    productTitle: "Queso fresco de rancho y requesón del día",
    producerName: "Familia Morales · Rancho San Isidro",
    category: "Comida y Gastronomía",
    categorySlug: "comida",
    isInStock: true,
    meetingPointBase: "Kiosco Plaza Principal",
    story:
      "Ordeña limpia cada madrugada. Cuajado artesanal en aro de madera sin conservadores ni féculas, entregado fresco en hielera sellada.",
    scheduleToday: "Hoy de 08:30 a 18:00 hrs",
    whatsappContact: "526181428910",
    photo: `${CDN_BASE}/queso-fresco.jpg`,
    avgRating: 4.9,
    reviewsCount: 18,
    completedSalesCount: 14,
    verifiedSalesCount: 12,
    dLat: 0.0034,
    dLng: -0.0028,
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    productTitle: "Pan de agua en horno de leña y miel de mezquite",
    producerName: "Horno Tradicional · Doña Carmen",
    category: "Comida y Gastronomía",
    categorySlug: "comida",
    isInStock: true,
    meetingPointBase: "Plazuela del Centro",
    story:
      "Masa madre fermentada lentamente y horneada en adobe con leña de encino recuperada, acompañada de miel cruda de mezquite sin filtrar.",
    scheduleToday: "Hoy de 08:00 a 17:30 hrs",
    whatsappContact: "526181983341",
    photo: `${CDN_BASE}/pan-artesanal.jpg`,
    avgRating: 5.0,
    reviewsCount: 24,
    completedSalesCount: 19,
    verifiedSalesCount: 17,
    dLat: -0.0042,
    dLng: 0.0036,
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    productTitle: "Árboles frutales injertados, pino local y suculentas",
    producerName: "Vivero Sierra Madre · Don Rogelio",
    category: "Plantas y Viveros",
    categorySlug: "plantas",
    isInStock: true,
    meetingPointBase: "Acceso Norte del Parque Local",
    story:
      "Plantas de ornato, suculentas, manzanos, duraznos y árboles nativos adaptados al clima de la región, criados con composta orgánica.",
    scheduleToday: "Hoy de 09:30 a 19:00 hrs",
    whatsappContact: "526182451120",
    photo: `${CDN_BASE}/vivero-plantas.jpg`,
    avgRating: 4.8,
    reviewsCount: 14,
    completedSalesCount: 9,
    verifiedSalesCount: 8,
    dLat: 0.0068,
    dLng: 0.0054,
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    productTitle: "Herbolaria medicinal, lavanda, romero y semillas criollas",
    producerName: "Huerto Vivo · Colectivo Botánico",
    category: "Plantas y Viveros",
    categorySlug: "plantas",
    isInStock: false,
    meetingPointBase: "Jardín Vecinal",
    story:
      "Macetas aromáticas de cocina, plantas medicinales y sobres de semilla criolla lista para huertos urbanos y traspatio.",
    scheduleToday: "Entregas hoy de 11:00 a 18:00 hrs",
    whatsappContact: "526183901188",
    photo: `${CDN_BASE}/herbolaria-lavanda.jpg`,
    avgRating: 4.7,
    reviewsCount: 9,
    completedSalesCount: 6,
    verifiedSalesCount: 5,
    dLat: -0.0071,
    dLng: -0.0062,
  },
  {
    id: "22222222-2222-4222-8222-222222222205",
    productTitle: "Cantera rosa y gris labrada a mano · Laja y adoquín",
    producerName: "Canteros Unidos · Maestro Aurelio",
    category: "Minería y Cantera",
    categorySlug: "mineria",
    isInStock: true,
    meetingPointBase: "Parador Público Sur",
    story:
      "Extracción y labrado artesanal de cantera: fuentes, columnas, pisos de laja natural, molcajetes de piedra volcánica y recubrimientos.",
    scheduleToday: "Muestras y pedidos hoy de 08:00 a 18:30 hrs",
    whatsappContact: "526185104432",
    photo: `${CDN_BASE}/cantera-rosa.jpg`,
    avgRating: 4.9,
    reviewsCount: 12,
    completedSalesCount: 8,
    verifiedSalesCount: 7,
    dLat: -0.0115,
    dLng: 0.0092,
  },
  {
    id: "22222222-2222-4222-8222-222222222206",
    productTitle: "Piedra de río seleccionada, grava decorativa y cuarzos",
    producerName: "Cooperativa Pétrea Regional",
    category: "Minería y Cantera",
    categorySlug: "mineria",
    isInStock: false,
    meetingPointBase: "Explanada Estación Antigua",
    story:
      "Materiales pétreos naturales para jardín, construcción tradicional y muestras minerales de hierro y cuarzo recolectadas legalmente.",
    scheduleToday: "Hoy de 09:00 a 17:00 hrs",
    whatsappContact: "526186219087",
    photo: `${CDN_BASE}/piedra-cuarzo.jpg`,
    avgRating: 4.6,
    reviewsCount: 7,
    completedSalesCount: 4,
    verifiedSalesCount: 3,
    dLat: 0.0132,
    dLng: -0.0104,
  },
  {
    id: "22222222-2222-4222-8222-222222222207",
    productTitle: "Canasta de hortalizas de estación y huevo de libre pastoreo",
    producerName: "Huerta Los Sauces · Familia Saucedo",
    category: "Campo y Huerta",
    categorySlug: "campo",
    isInStock: true,
    meetingPointBase: "Glorieta del Mercado Local",
    story:
      "Cosechamos acelga, rábano, calabacita, cilantro criollo y recolectamos huevo de rancho una hora antes de vernos en el punto público.",
    scheduleToday: "Entregas hoy 12:30 y 17:30 hrs",
    whatsappContact: "526184059182",
    photo: `${CDN_BASE}/hortalizas-huevo.jpg`,
    avgRating: 4.9,
    reviewsCount: 21,
    completedSalesCount: 16,
    verifiedSalesCount: 15,
    dLat: 0.0051,
    dLng: -0.0081,
  },
  {
    id: "22222222-2222-4222-8222-222222222208",
    productTitle: "Manzana criolla, nuez de cáscara de papel y frijol pinto",
    producerName: "Productores del Valle · Don Hilario",
    category: "Campo y Huerta",
    categorySlug: "campo",
    isInStock: true,
    meetingPointBase: "Explanada Mercado Municipal",
    story:
      "Fruta recién traída de huertas familiares y frijol pinto de temporal limpio, cribado a mano y sin intermediarios.",
    scheduleToday: "Hoy de 08:30 a 18:00 hrs",
    whatsappContact: "526187442310",
    photo: `${CDN_BASE}/manzana-nuez.jpg`,
    avgRating: 4.8,
    reviewsCount: 16,
    completedSalesCount: 11,
    verifiedSalesCount: 10,
    dLat: -0.0058,
    dLng: -0.0095,
  },
  {
    id: "22222222-2222-4222-8222-222222222209",
    productTitle: "Cazuelas y jarros de barro bruñido libres de plomo",
    producerName: "Taller Sierra · Maestro Mateo",
    category: "Artesanía y Talleres",
    categorySlug: "artesania",
    isInStock: true,
    meetingPointBase: "Corredor Peatonal Cultural",
    story:
      "Barro recolectado localmente, moldeado a mano y horneado a baja temperatura con esmaltes minerales 100% libres de plomo.",
    scheduleToday: "Hoy de 11:00 a 20:00 hrs",
    whatsappContact: "526185126093",
    photo: `${CDN_BASE}/barro-artesanal.jpg`,
    avgRating: 5.0,
    reviewsCount: 19,
    completedSalesCount: 13,
    verifiedSalesCount: 12,
    dLat: 0.0089,
    dLng: 0.0021,
  },
  {
    id: "22222222-2222-4222-8222-222222222210",
    productTitle: "Bateas de madera de pino y talabartería tradicional",
    producerName: "Taller El Mezquite · Familia Reyes",
    category: "Artesanía y Talleres",
    categorySlug: "artesania",
    isInStock: false,
    meetingPointBase: "Portal Sur de la Plaza",
    story:
      "Utensilios de cocina tallados en madera certificada y artículos de cuero curtido vegetalmente.",
    scheduleToday: "Hoy de 10:30 a 19:00 hrs",
    whatsappContact: "526188321944",
    photo: `${CDN_BASE}/madera-talabarteria.png`,
    avgRating: 4.7,
    reviewsCount: 8,
    completedSalesCount: 5,
    verifiedSalesCount: 4,
    dLat: -0.0094,
    dLng: 0.0018,
  },
  {
    id: "22222222-2222-4222-8222-222222222211",
    productTitle: "Bolsos, blusas y caminos de mesa con bordado tradicional",
    producerName: "Colectivo Textil · Maestra Elena",
    category: "Textiles y Moda Local",
    categorySlug: "textiles",
    isInStock: true,
    meetingPointBase: "Kiosco Plaza de Armas",
    story:
      "Piezas únicas tejidas y bordadas en punto de cruz por mujeres artesanas, utilizando algodón natural e hilos de alta durabilidad.",
    scheduleToday: "Hoy de 10:00 a 19:00 hrs",
    whatsappContact: "526182091145",
    photo: `${CDN_BASE}/textiles-bordado.jpg`,
    avgRating: 4.9,
    reviewsCount: 15,
    completedSalesCount: 10,
    verifiedSalesCount: 9,
    dLat: 0.0023,
    dLng: 0.0112,
  },
  {
    id: "22222222-2222-4222-8222-222222222212",
    productTitle: "Gabanes, cobijas y prendas de lana en telar de pedal",
    producerName: "Telares del Valle · Don Sebastián",
    category: "Textiles y Moda Local",
    categorySlug: "textiles",
    isInStock: false,
    meetingPointBase: "Atrio Parroquia Central",
    story:
      "Tejido tradicional en lana natural lavada y cardada a mano, ideal para noches frescas y temporada de frío.",
    scheduleToday: "Hoy de 09:30 a 17:30 hrs",
    whatsappContact: "526183119904",
    photo: `${CDN_BASE}/telar-lana.jpg`,
    avgRating: 4.8,
    reviewsCount: 11,
    completedSalesCount: 7,
    verifiedSalesCount: 6,
    dLat: -0.0029,
    dLng: -0.0124,
  },
  {
    id: "22222222-2222-4222-8222-222222222213",
    productTitle: "Carpintería de barrio, afilado y restauración de muebles",
    producerName: "Oficios San José · Maestro Luis",
    category: "Servicios y Oficios",
    categorySlug: "servicios",
    isInStock: true,
    meetingPointBase: "Esquina Parque Comunitario",
    story:
      "Reparación de sillas, puertas, afilado de cuchillos de cocina y mantenimiento de madera en el día con presupuesto claro.",
    scheduleToday: "Hoy de 09:00 a 18:30 hrs",
    whatsappContact: "526184770123",
    photo: `${CDN_BASE}/carpinteria-oficios.png`,
    avgRating: 4.9,
    reviewsCount: 17,
    completedSalesCount: 12,
    verifiedSalesCount: 11,
    dLat: 0.0148,
    dLng: 0.0085,
  },
  {
    id: "22222222-2222-4222-8222-222222222214",
    productTitle: "Herrería artística, soldadura móvil y arreglo de bicicletas",
    producerName: "Taller Forja Viva · Ing. Marcos",
    category: "Servicios y Oficios",
    categorySlug: "servicios",
    isInStock: true,
    meetingPointBase: "Bulevar Principal / Zona Segura",
    story:
      "Ajuste de bicicletas, soldadura ligera a domicilio y fabricación de maceteros o protecciones a medida con garantía local.",
    scheduleToday: "Hoy de 08:30 a 19:00 hrs",
    whatsappContact: "526186009812",
    photo: `${CDN_BASE}/herreria-forja.jpg`,
    avgRating: 4.8,
    reviewsCount: 13,
    completedSalesCount: 9,
    verifiedSalesCount: 8,
    dLat: -0.0138,
    dLng: -0.0046,
  },
];

const OFFSET_BY_ID = new Map<string, { dLat: number; dLng: number }>(
  DEMO_SEEDS.map((s) => [s.id, { dLat: s.dLat, dLng: s.dLng }])
);

/**
 * Reposiciona todos los negocios de prueba (`22222222-...`) alrededor de la ubicación
 * real del usuario (0.35 km – 3.4 km) para que todas las pruebas funcionen en cualquier ciudad.
 * Los negocios reales creados por usuarios conservan sus coordenadas originales.
 */
export function anchorDemoBusinessesAroundCoords(
  list: ProducerPost[],
  userCoords: GeoCoordinates,
  cityLabel?: string
): ProducerPost[] {
  const shortCity = cityLabel?.split(",")[0]?.trim();

  return list.map((item, idx) => {
    if (!isDemoBusinessId(item.id) || item.isUserPost) {
      return item;
    }

    const offset = OFFSET_BY_ID.get(item.id) ?? {
      dLat: Math.cos(idx * 1.1) * 0.008,
      dLng: Math.sin(idx * 1.1) * 0.008,
    };

    const nextLat = Number((userCoords.lat + offset.dLat).toFixed(6));
    const nextLng = Number((userCoords.lng + offset.dLng).toFixed(6));

    const meetingPoint =
      shortCity &&
      !item.meetingPoint.toLowerCase().includes(shortCity.toLowerCase())
        ? `${item.meetingPoint} · ${shortCity}`
        : item.meetingPoint;

    return {
      ...item,
      approxLat: nextLat,
      approxLng: nextLng,
      meetingPoint,
    };
  });
}

/**
 * Catálogo completo de prueba posicionado alrededor de `userCoords` como respaldo
 * inmediato cuando no hay red o Supabase aún no tiene registros locales.
 */
export function buildNearbyDemoBusinesses(
  userCoords: GeoCoordinates,
  cityLabel?: string
): ProducerPost[] {
  const shortCity = cityLabel?.split(",")[0]?.trim();

  return DEMO_SEEDS.map((seed) => ({
    id: seed.id,
    slug: `negocio-${seed.id}`,
    ownerId: null,
    productTitle: seed.productTitle,
    producerName: seed.producerName,
    category: seed.category,
    categorySlug: seed.categorySlug,
    freshnessStatus: seed.isInStock ? "confirmed" : "on_request",
    freshnessLabel: seed.isInStock ? "Disponible hoy" : "Bajo pedido",
    isInStock: seed.isInStock,
    distanceKm: 1.0,
    meetingPoint: shortCity
      ? `${seed.meetingPointBase} · ${shortCity}`
      : seed.meetingPointBase,
    story: seed.story,
    scheduleToday: seed.scheduleToday,
    whatsappContact: seed.whatsappContact,
    approxLat: Number((userCoords.lat + seed.dLat).toFixed(6)),
    approxLng: Number((userCoords.lng + seed.dLng).toFixed(6)),
    photos: [seed.photo],
    avgRating: seed.avgRating,
    reviewsCount: seed.reviewsCount,
    completedSalesCount: seed.completedSalesCount,
    verifiedSalesCount: seed.verifiedSalesCount,
    isUserPost: false,
  }));
}

export function getDemoReviewsForBusiness(
  businessId: string
): BusinessReview[] {
  if (!isDemoBusinessId(businessId)) return [];
  const seed = DEMO_SEEDS.find((s) => s.id === businessId);
  const title = seed?.productTitle ?? "el producto";
  const now = Date.now();
  return [
    {
      id: `demo-rev-1-${businessId}`,
      businessId,
      reviewerName: "Sofía M.",
      rating: 5,
      comment: `Excelente trato y entrega puntual. Muy buena calidad en ${title.toLowerCase()}.`,
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `demo-rev-2-${businessId}`,
      businessId,
      reviewerName: "Carlos R.",
      rating: 5,
      comment: "Todo tal cual las fotos, punto de encuentro seguro y rápido.",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function getDemoPublicSalesForBusiness(
  businessId: string
): PublicBusinessSale[] {
  if (!isDemoBusinessId(businessId)) return [];
  const seed = DEMO_SEEDS.find((s) => s.id === businessId);
  const itemName = seed?.productTitle.split("·")[0]?.trim() || "Pedido local";
  const now = Date.now();
  return [
    {
      id: `demo-sale-1-${businessId}`,
      businessId,
      itemSummary: itemName,
      quantity: 2,
      buyerConfirmed: true,
      buyerConfirmedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      verificationLabel: "Entrega verificada",
    },
    {
      id: `demo-sale-2-${businessId}`,
      businessId,
      itemSummary: `Lote de ${itemName.toLowerCase()}`,
      quantity: 1,
      buyerConfirmed: true,
      buyerConfirmedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 28 * 60 * 60 * 1000).toISOString(),
      verificationLabel: "Entrega verificada",
    },
  ];
}

export function buildDemoProducerReply(
  businessName: string,
  producerName: string,
  userMessage: string
): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("precio") || lower.includes("cuanto") || lower.includes("cuánto") || lower.includes("cuesta")) {
    return `¡Hola! Hoy tenemos "${businessName}" recién listo. El precio depende del tamaño del paquete; si gustas nos vemos en el punto de encuentro y te muestro las opciones sin compromiso.`;
  }
  if (lower.includes("hora") || lower.includes("cuando") || lower.includes("cuándo") || lower.includes("disponible") || lower.includes("hoy")) {
    return `¡Sí, tenemos disponible hoy! Podemos coordinar la entrega en el punto de encuentro público que aparece en nuestra ficha. ¿A qué hora te queda mejor?`;
  }
  if (lower.includes("donde") || lower.includes("dónde") || lower.includes("ubicacion") || lower.includes("ubicación")) {
    return `Entregamos en nuestro punto público seguro cerca de tu zona. Cuando confirmes tu pedido te aviso 10 minutos antes de llegar.`;
  }
  return `¡Gracias por escribir a ${producerName}! Recibimos tu mensaje sobre "${businessName}". Tenemos disponibilidad hoy y podemos coordinar entrega directa en tu zona.`;
}
