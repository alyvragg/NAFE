"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bookmark, Star } from "lucide-react";
import {
  ProducerPost,
  ProducerCategory,
  PRODUCER_CATEGORIES,
} from "@/lib/businesses";
import { GeoCoordinates } from "@/lib/nativeBridge";

const OsmRadarMap = dynamic(() => import("./OsmRadarMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] w-full items-center justify-center rounded-xl bg-[#FFFFFF] text-sm font-medium text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
      Cargando mapa…
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
  onOpenChatWithBusiness: (producer: ProducerPost) => void;
  onlySaved?: boolean;
  isDesktop?: boolean;
}

const SHORT_CATEGORY_LABELS: Record<ProducerCategory, string> = {
  Todo: "Todo",
  "Comida y Gastronomía": "Comida",
  "Plantas y Viveros": "Plantas",
  "Minería y Cantera": "Minería",
  "Campo y Huerta": "Campo",
  "Artesanía y Talleres": "Artesanía",
  "Textiles y Moda Local": "Textiles",
  "Servicios y Oficios": "Servicios",
};

export function getShortCategoryLabel(category: ProducerCategory): string {
  return SHORT_CATEGORY_LABELS[category] || category;
}

export function BuyerRadarView({
  userCoords,
  cityLabel,
  searchRadiusKm,
  onChangeRadius,
  producers,
  savedIds,
  onToggleSave,
  onSelectProducer,
  onOpenSellerProfile,
  onOpenChatWithBusiness,
  onlySaved = false,
  isDesktop = false,
}: BuyerRadarViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ProducerCategory>("Todo");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");

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
      if (sortBy === "rating") {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b.reviewsCount - a.reviewsCount;
      }
      return a.distanceKm - b.distanceKm;
    });
  }, [producers, onlySaved, savedIds, activeCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Buscador Directo y Limpio */}
      {!onlySaved && (
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6D5F]"
            strokeWidth={1.6}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar"
            className="h-11 w-full rounded-lg bg-[#FFFFFF] pl-10 pr-9 text-sm text-[#13150C] placeholder:text-[#6E6D5F] shadow-[0_2px_10px_rgba(19,21,12,0.04)] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("Todo");
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
            >
              <X className="h-4 w-4" strokeWidth={1.6} />
            </button>
          )}
        </div>
      )}

      {/* 2. Chips de Categorías (Solo texto limpio, cero íconos) */}
      <div
        className="nafe-scroll -mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-1 pb-0.5"
        role="tablist"
        aria-label="Categorías"
      >
        {PRODUCER_CATEGORIES.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(category)}
              className={[
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-[#2B4628] text-[#F7F7F4]"
                  : "bg-[#EFEFEA] text-[#13150C] hover:bg-[#FFFFFF]",
              ].join(" ")}
            >
              {SHORT_CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      {/* 3. Ordenamiento y Selector Lista / Mapa (Cero íconos decorativos) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#EFEFEA] p-1">
          <button
            type="button"
            onClick={() => setSortBy("distance")}
            className={[
              "h-full rounded-md px-2.5 text-xs font-semibold transition-colors",
              sortBy === "distance"
                ? "bg-[#FFFFFF] text-[#13150C]"
                : "text-[#6E6D5F] hover:text-[#13150C]",
            ].join(" ")}
          >
            Cercanía ({filteredProducers.length})
          </button>
          <button
            type="button"
            onClick={() => setSortBy("rating")}
            className={[
              "inline-flex h-full items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
              sortBy === "rating"
                ? "bg-[#FFFFFF] text-[#13150C]"
                : "text-[#6E6D5F] hover:text-[#13150C]",
            ].join(" ")}
          >
            <Star
              className="h-3.5 w-3.5 text-[#C88A1E]"
              fill="currentColor"
              strokeWidth={1.6}
            />
            <span>Calificación</span>
          </button>
        </div>

        <div
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#EFEFEA] p-1"
          role="group"
          aria-label="Vista"
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={[
              "h-full rounded-md px-3 text-xs font-semibold transition-colors",
              viewMode === "list"
                ? "bg-[#2B4628] text-[#F7F7F4]"
                : "text-[#6E6D5F] hover:text-[#13150C]",
            ].join(" ")}
          >
            Lista
          </button>

          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={[
              "h-full rounded-md px-3 text-xs font-semibold transition-colors",
              viewMode === "map"
                ? "bg-[#2B4628] text-[#F7F7F4]"
                : "text-[#6E6D5F] hover:text-[#13150C]",
            ].join(" ")}
          >
            Mapa
          </button>
        </div>
      </div>

      {/* 4. Vista Lista o Mapa */}
      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.section
            key="osm-real-map"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
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
              onOpenChatWithBusiness={onOpenChatWithBusiness}
            />
          </motion.section>
        ) : (
          <motion.div
            key="producers-list-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={
              isDesktop
                ? "grid grid-cols-1 gap-3.5 md:grid-cols-2"
                : "space-y-3"
            }
          >
            {filteredProducers.length === 0 ? (
              <div className="col-span-full rounded-xl bg-[#FFFFFF] p-6 text-center shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
                <p className="text-[15px] font-medium text-[#13150C]">
                  {onlySaved
                    ? "Sin negocios guardados"
                    : "Sin resultados en este radio"}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {(activeCategory !== "Todo" || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory("Todo");
                        setSearchQuery("");
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2B4628] px-3.5 text-sm font-medium text-[#F7F7F4]"
                    >
                      Ver todo
                    </button>
                  )}
                  {searchRadiusKm < 50 && !onlySaved && (
                    <button
                      type="button"
                      onClick={() => onChangeRadius(50)}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#EFEFEA] px-3.5 text-sm font-medium text-[#13150C]"
                    >
                      Ampliar a 50 km
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredProducers.map((producer) => {
                const isConfirmed = producer.freshnessStatus === "confirmed";
                const isSaved = savedIds.includes(producer.id);
                const coverPhoto =
                  producer.photos && producer.photos.length > 0
                    ? producer.photos[0]
                    : null;

                return (
                  <article
                    key={producer.id}
                    onClick={() => onSelectProducer(producer)}
                    className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl bg-[#FFFFFF] shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(19,21,12,0.07)]"
                  >
                    <div>
                      {/* Si tiene foto real se muestra; si no, superficie limpia tonal #EFEFEA sin ícono */}
                      {coverPhoto ? (
                        <div className="relative h-36 w-full overflow-hidden bg-[#EFEFEA]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverPhoto}
                            alt={producer.productTitle}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 w-full items-center justify-between bg-[#EFEFEA] px-4">
                          <span className="text-xs font-medium text-[#6E6D5F]">
                            {SHORT_CATEGORY_LABELS[producer.category]}
                          </span>
                          <span className="text-xs font-medium text-[#6E6D5F]">
                            {producer.distanceKm} km
                          </span>
                        </div>
                      )}

                      <div className="p-4 pb-2.5">
                        {/* Fila superior: Estado + Calificación/Entregas + Favorito sin fondo */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={[
                                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                                isConfirmed
                                  ? "bg-[#1F3A26] text-[#F4F7F4]"
                                  : "bg-[#F2DCDC] text-[#7A2727]",
                              ].join(" ")}
                            >
                              {producer.freshnessLabel}
                            </span>

                            <span className="inline-flex items-center gap-1 text-xs text-[#6E6D5F]">
                              <Star
                                className="h-3.5 w-3.5 text-[#C88A1E]"
                                fill="currentColor"
                                strokeWidth={1.6}
                              />
                              <span>
                                {producer.avgRating.toFixed(1)} (
                                {producer.reviewsCount})
                                {producer.completedSalesCount > 0
                                  ? ` · ${producer.completedSalesCount} ${
                                      producer.completedSalesCount === 1
                                        ? "entrega"
                                        : "entregas"
                                    }`
                                  : ""}
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSave(producer.id);
                            }}
                            aria-label={
                              isSaved
                                ? "Quitar de guardados"
                                : "Guardar negocio"
                            }
                            className={[
                              "bg-transparent p-1.5 transition-colors",
                              isSaved
                                ? "text-[#1F3A26]"
                                : "text-[#13150C]/45 hover:text-[#13150C]",
                            ].join(" ")}
                          >
                            <Bookmark
                              className="h-4 w-4"
                              strokeWidth={1.6}
                              fill={isSaved ? "currentColor" : "none"}
                            />
                          </button>
                        </div>

                        {/* Título de tarjeta en Plus Jakarta Sans 15px */}
                        <h3 className="mt-2 text-[15px] font-medium leading-snug text-[#13150C]">
                          {producer.productTitle}
                        </h3>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellerProfile(producer.producerName);
                          }}
                          className="mt-1 inline-block text-xs font-medium text-[#2B4628] hover:underline underline-offset-4"
                        >
                          {producer.producerName}
                        </button>

                        {/* Metadatos limpios sin íconos repetitivos */}
                        <div className="mt-2.5 space-y-0.5 rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs text-[#6E6D5F]">
                          <p className="truncate font-medium text-[#13150C]">
                            {producer.distanceKm} km · {producer.meetingPoint}
                          </p>
                          <p className="truncate">{producer.scheduleToday}</p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones inferiores (Solo texto, sin íconos) */}
                    <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChatWithBusiness(producer);
                        }}
                        className="inline-flex h-8 items-center rounded-lg bg-[#EFEFEA] px-3 text-xs font-semibold text-[#13150C] transition-colors hover:bg-[#2B4628] hover:text-[#F7F7F4]"
                      >
                        Enviar mensaje
                      </button>

                      <span className="text-xs font-semibold text-[#2B4628]">
                        Ver detalle
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
