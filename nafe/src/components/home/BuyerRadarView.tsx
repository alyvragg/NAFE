"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  List,
  MapPin,
  Bookmark,
  Clock,
  ChevronRight,
  LayoutGrid,
  UtensilsCrossed,
  Sprout,
  Mountain,
  Wheat,
  Hammer,
  Scissors,
  Wrench,
  Sparkles,
  Store,
} from "lucide-react";
import {
  ProducerPost,
  ProducerCategory,
  PRODUCER_CATEGORIES,
} from "@/data/mockProducers";
import { GeoCoordinates } from "@/lib/nativeBridge";

const OsmRadarMap = dynamic(() => import("./OsmRadarMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] w-full items-center justify-center rounded-xl border border-[#949172]/40 bg-white/50 text-[14px] font-medium text-[#13150C]/70">
      Cargando mapa OpenStreetMap…
    </div>
  ),
});

interface BuyerRadarViewProps {
  userName: string;
  userCoords: GeoCoordinates;
  cityLabel: string;
  searchRadiusKm: number;
  onChangeRadius: (radiusKm: number) => void;
  producers: ProducerPost[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onSelectProducer: (producer: ProducerPost) => void;
  onOpenSellerProfile: (producerName: string) => void;
  onlySaved?: boolean;
  isDesktop?: boolean;
}

const QUICK_RECOMMENDATION_PROMPTS: Array<{
  label: string;
  query: string;
}> = [
  { label: "Algo fresco para comer", query: "queso" },
  { label: "Plantas para casa", query: "árboles" },
  { label: "Cantera o piedra", query: "cantera" },
  { label: "Artesanía local", query: "barro" },
  { label: "Pan de leña y miel", query: "pan" },
  { label: "Hortalizas y huevo", query: "hortalizas" },
  { label: "Bordado y lana", query: "bordado" },
  { label: "Oficios de barrio", query: "carpintería" },
];

export function getSectionIcon(
  category: ProducerCategory
): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  switch (category) {
    case "Todo":
      return LayoutGrid;
    case "Comida y Gastronomía":
      return UtensilsCrossed;
    case "Plantas y Viveros":
      return Sprout;
    case "Minería y Cantera":
      return Mountain;
    case "Campo y Huerta":
      return Wheat;
    case "Artesanía y Talleres":
      return Hammer;
    case "Textiles y Moda Local":
      return Scissors;
    case "Servicios y Oficios":
      return Wrench;
    default:
      return LayoutGrid;
  }
}

export function BuyerRadarView({
  userName,
  userCoords,
  cityLabel,
  searchRadiusKm,
  onChangeRadius,
  producers,
  savedIds,
  onToggleSave,
  onSelectProducer,
  onOpenSellerProfile,
  onlySaved = false,
  isDesktop = false,
}: BuyerRadarViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ProducerCategory>("Todo");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const firstName = userName.trim().split(/\s+/)[0] || "Alex";

  const categoryCounts = useMemo(() => {
    const counts: Record<ProducerCategory, number> = {
      Todo: 0,
      "Comida y Gastronomía": 0,
      "Plantas y Viveros": 0,
      "Minería y Cantera": 0,
      "Campo y Huerta": 0,
      "Artesanía y Talleres": 0,
      "Textiles y Moda Local": 0,
      "Servicios y Oficios": 0,
    };

    for (const item of producers) {
      if (onlySaved && !savedIds.includes(item.id)) continue;
      counts.Todo += 1;
      if (counts[item.category] !== undefined) {
        counts[item.category] += 1;
      }
    }
    return counts;
  }, [producers, onlySaved, savedIds]);

  const filteredProducers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = producers.filter((item) => {
      if (onlySaved && !savedIds.includes(item.id)) {
        return false;
      }
      if (activeCategory !== "Todo" && item.category !== activeCategory) {
        return false;
      }
      if (q) {
        const matchesTitle = item.productTitle.toLowerCase().includes(q);
        const matchesProducer = item.producerName.toLowerCase().includes(q);
        const matchesZone = item.meetingPoint.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesStory = item.story.toLowerCase().includes(q);
        return (
          matchesTitle ||
          matchesProducer ||
          matchesZone ||
          matchesCategory ||
          matchesStory
        );
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      if (q) {
        const aConfirmed = a.freshnessStatus === "confirmed" ? 1 : 0;
        const bConfirmed = b.freshnessStatus === "confirmed" ? 1 : 0;
        if (aConfirmed !== bConfirmed) return bConfirmed - aConfirmed;
      }
      return a.distanceKm - b.distanceKm;
    });
  }, [producers, onlySaved, savedIds, activeCategory, searchQuery]);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Bloque Recomendador Conversacional + Buscador 100% ancho en una sola línea */}
      {!onlySaved && (
        <section className="rounded-xl border border-[#949172]/40 bg-white/70 p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-[22px] sm:text-[24px] font-medium leading-tight text-[#13150C]/80">
              ¿Qué estás buscando hoy,{" "}
              <span className="italic">{firstName}</span>?
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#DBF7EC] px-2.5 py-1 text-[11px] font-semibold text-[#3D562F]">
              <Sparkles className="h-3 w-3" />
              Cerca de ti
            </span>
          </div>

          <div className="relative mt-3 w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#949172]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe qué necesitas hoy (ej. queso fresco, árboles, cantera, barro)…"
              aria-label="Buscar qué necesitas hoy"
              className="h-[48px] w-full rounded-lg border border-[#949172]/45 bg-white pl-10 pr-9 text-[14.5px] text-[#13150C] placeholder:text-[#949172] outline-none transition-all focus:border-[#3D562F] focus:ring-4 focus:ring-[#3D562F]/12"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("Todo");
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#949172] hover:bg-[#949172]/15 hover:text-[#13150C]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Chips de intención rápida en una sola fila deslizable */}
          <div className="nafe-scroll mt-2.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_RECOMMENDATION_PROMPTS.map((item) => {
              const isSelected =
                searchQuery.toLowerCase() === item.query.toLowerCase();
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSearchQuery("");
                      setActiveCategory("Todo");
                    } else {
                      setSearchQuery(item.query);
                      setActiveCategory("Todo");
                    }
                  }}
                  className={[
                    "shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    isSelected
                      ? "border-[#3D562F] bg-[#3D562F] text-[#DEDED8]"
                      : "border-[#949172]/35 bg-[#DEDED8]/55 text-[#13150C]/80 hover:border-[#3D562F]/50 hover:bg-white",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. 8 Secciones en UNA SOLA FILA deslizable horizontalmente */}
      <div
        className="nafe-scroll -mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Secciones de economía local"
      >
        {PRODUCER_CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          const SectionIcon = getSectionIcon(category);
          const count = categoryCounts[category] ?? 0;

          return (
            <motion.button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveCategory(category)}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? "border-[#3D562F] bg-[#3D562F] text-[#DEDED8] shadow-[0_4px_12px_rgba(61,86,47,0.18)]"
                  : "border-[#949172]/40 bg-white/60 text-[#13150C] hover:border-[#3D562F]/50 hover:bg-white/85",
              ].join(" ")}
            >
              <SectionIcon className="h-4 w-4 shrink-0" />
              <span>{category}</span>
              <span
                className={[
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  isActive
                    ? "bg-black/20 text-[#DBF7EC]"
                    : "bg-[#949172]/20 text-[#13150C]/75",
                ].join(" ")}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 3. Contador + Selector de Vista: Lista (activo por defecto) | Mapa */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <span className="text-[12.5px] text-[#13150C]/75">
          <strong className="font-semibold text-[#13150C]">
            {filteredProducers.length}
          </strong>{" "}
          {filteredProducers.length === 1
            ? "resultado cercano"
            : "resultados cercanos"}{" "}
          · Radio {searchRadiusKm} km
        </span>

        <div
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-[#949172]/35 bg-[#949172]/15 p-1"
          role="group"
          aria-label="Cambiar entre Lista y Mapa"
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={[
              "flex h-full items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold transition-all",
              viewMode === "list"
                ? "bg-[#3D562F] text-[#DEDED8] shadow-2xs"
                : "text-[#13150C]/75 hover:text-[#13150C]",
            ].join(" ")}
          >
            <List className="h-3.5 w-3.5" />
            <span>Lista</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={[
              "flex h-full items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold transition-all",
              viewMode === "map"
                ? "bg-[#3D562F] text-[#DEDED8] shadow-2xs"
                : "text-[#13150C]/75 hover:text-[#13150C]",
            ].join(" ")}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Mapa</span>
          </button>
        </div>
      </div>

      {/* 4. Vista Lista (por defecto) vs Mapa OpenStreetMap */}
      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.section
            key="osm-real-map"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
          >
            <OsmRadarMap
              producers={filteredProducers}
              userCoords={userCoords}
              cityLabel={cityLabel}
              searchRadiusKm={searchRadiusKm}
              onChangeRadius={onChangeRadius}
              savedIds={savedIds}
              onToggleSave={onToggleSave}
              onSelectProducer={onSelectProducer}
              onOpenSellerProfile={onOpenSellerProfile}
            />
          </motion.section>
        ) : (
          <motion.div
            key="producers-list-grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className={
              isDesktop
                ? "grid grid-cols-1 gap-4 md:grid-cols-2"
                : "space-y-3.5"
            }
          >
            {filteredProducers.length === 0 ? (
              <div className="col-span-full rounded-xl border border-[#949172]/35 bg-white/55 p-8 text-center">
                <p className="font-serif text-[22px] text-[#13150C]/80">
                  {onlySaved
                    ? "Aún no tienes puestos guardados"
                    : "No encontramos resultados dentro de este radio"}
                </p>
                <p className="mt-1.5 text-[13.5px] text-[#13150C]/65">
                  {onlySaved
                    ? "Marca cualquier tarjeta del radar para guardarla en tu dispositivo."
                    : "Prueba seleccionando 'Todo' o ampliando el radio de búsqueda."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {(activeCategory !== "Todo" || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory("Todo");
                        setSearchQuery("");
                      }}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#3D562F] px-4 text-[13px] font-semibold text-white"
                    >
                      Ver todos los productores
                    </button>
                  )}
                  {searchRadiusKm < 50 && !onlySaved && (
                    <button
                      type="button"
                      onClick={() => onChangeRadius(50)}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[#3D562F] bg-white px-4 text-[13px] font-semibold text-[#3D562F]"
                    >
                      Ampliar radio a 50 km
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredProducers.map((producer, index) => {
                const isConfirmed = producer.freshnessStatus === "confirmed";
                const isSaved = savedIds.includes(producer.id);
                const SectionIcon = getSectionIcon(producer.category);
                const coverPhoto =
                  producer.photos && producer.photos.length > 0
                    ? producer.photos[0]
                    : null;

                return (
                  <motion.article
                    key={producer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.24,
                      delay: Math.min(index * 0.03, 0.18),
                    }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelectProducer(producer)}
                    className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-[#949172]/40 bg-white/80 shadow-[0_6px_20px_rgba(19,21,12,0.04)] transition-all duration-200 hover:border-[#3D562F]/60 hover:bg-white hover:shadow-[0_12px_28px_rgba(61,86,47,0.1)]"
                  >
                    <div>
                      {coverPhoto && (
                        <div className="relative h-40 w-full overflow-hidden bg-[#DEDED8]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverPhoto}
                            alt={producer.productTitle}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13150C]/60 via-transparent to-[#13150C]/20" />

                          <div className="absolute inset-x-3 top-2.5 flex items-start justify-between gap-2">
                            <span
                              className={[
                                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-[#13150C] shadow-xs",
                                isConfirmed ? "bg-[#DBF7EC]" : "bg-[#F7DBDB]",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "h-2 w-2 rounded-xs",
                                  isConfirmed
                                    ? "bg-[#3D562F]"
                                    : "bg-[#9E4242]",
                                ].join(" ")}
                              />
                              {producer.freshnessLabel}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave(producer.id);
                              }}
                              aria-label={
                                isSaved
                                  ? "Quitar de guardados"
                                  : "Guardar productor"
                              }
                              className={[
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                isSaved
                                  ? "border-[#3D562F] bg-[#DBF7EC] text-[#3D562F]"
                                  : "border-white/40 bg-[#13150C]/55 text-white hover:bg-[#13150C]/80",
                              ].join(" ")}
                            >
                              <Bookmark
                                className="h-4 w-4"
                                fill={isSaved ? "currentColor" : "none"}
                              />
                            </button>
                          </div>

                          <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#DEDED8]/95 px-2.5 py-0.5 text-[11px] font-semibold text-[#13150C]">
                              <SectionIcon className="h-3 w-3 text-[#3D562F]" />
                              <span>{producer.category}</span>
                            </span>

                            <span className="rounded-md bg-[#3D562F] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#DEDED8]">
                              A {producer.distanceKm} km
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 pb-2">
                        <h3 className="font-serif text-[21px] font-medium leading-[1.2] text-[#13150C]/80 group-hover:text-[#13150C]">
                          {producer.productTitle}
                        </h3>

                        {/* Clickable Producer Profile Name */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellerProfile(producer.producerName);
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-[#3D562F] hover:underline underline-offset-4"
                        >
                          <Store className="h-3.5 w-3.5" />
                          <span>{producer.producerName}</span>
                        </button>

                        <div className="mt-3 space-y-1.5 rounded-lg bg-[#DEDED8]/55 px-3.5 py-2.5 text-[12.5px] text-[#13150C]/80">
                          <div className="flex items-center gap-2 font-medium">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3D562F]" />
                            <span className="truncate">
                              A {producer.distanceKm} km ·{" "}
                              {producer.meetingPoint}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[#13150C]/65">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#949172]" />
                            <span>{producer.scheduleToday}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-4">
                      <span className="inline-flex items-center rounded-md border border-[#949172]/45 bg-[#949172]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#13150C]/80">
                        {producer.savingsTag}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3D562F] transition-transform group-hover:translate-x-0.5">
                        <span>Ver fotos y WhatsApp</span>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.article>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
