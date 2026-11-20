"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, ChevronLeft, ChevronRight, Bookmark, Star } from "lucide-react";
import { ProducerPost } from "@/lib/businesses";
import { GeoCoordinates } from "@/lib/nativeBridge";

interface OsmRadarMapProps {
  producers: ProducerPost[];
  userCoords: GeoCoordinates;
  cityLabel: string;
  searchRadiusKm: number;
  onChangeRadius: (radiusKm: number) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onSelectProducer: (producer: ProducerPost) => void;
  onOpenSellerProfile: (producerName: string) => void;
  onOpenChatWithBusiness: (producer: ProducerPost) => void;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function OsmRadarMap({
  producers,
  userCoords,
  cityLabel,
  searchRadiusKm,
  onChangeRadius,
  savedIds,
  onToggleSave,
  onSelectProducer,
  onOpenSellerProfile,
  onOpenChatWithBusiness,
}: OsmRadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeCardProducer, setActiveCardProducer] =
    useState<ProducerPost | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([userCoords.lat, userCoords.lng], map.getZoom(), {
      animate: true,
    });
  }, [userCoords.lat, userCoords.lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (searchRadiusKm > 0) {
      L.circle([userCoords.lat, userCoords.lng], {
        radius: searchRadiusKm * 1000,
        color: "#2B4628",
        weight: 1.5,
        opacity: 0.4,
        fillColor: "#1F3A26",
        fillOpacity: 0.08,
        dashArray: "6 6",
        interactive: false,
      }).addTo(layerGroup);
    }

    const userIcon = L.divIcon({
      className: "nafe-osm-user-marker",
      html: `
        <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(43,70,40,0.22);"></span>
          <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:#2B4628;box-shadow:0 2px 6px rgba(19,21,12,0.35);"></span>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([userCoords.lat, userCoords.lng], {
      icon: userIcon,
      title: `Tu ubicación (${cityLabel})`,
    }).addTo(layerGroup);

    producers.forEach((producer) => {
      const isConfirmed = producer.freshnessStatus === "confirmed";
      const isSelected = activeCardProducer?.id === producer.id;

      const pulseHtml = isConfirmed
        ? `<span class="animate-ping" style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(217,56,58,0.42);"></span>`
        : "";

      const ringHtml = isSelected
        ? `box-shadow:0 0 0 4px rgba(217,56,58,0.35), 0 3px 10px rgba(19,21,12,0.45);transform:scale(1.22);`
        : `box-shadow:0 2px 6px rgba(19,21,12,0.38);`;

      const redDotIcon = L.divIcon({
        className: "nafe-osm-red-dot",
        html: `
          <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${pulseHtml}
            <span class="w-4 h-4 bg-[#D9383A] shadow-md rounded-full" style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;background:#D9383A;transition:transform 0.18s ease;${ringHtml}"></span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([producer.approxLat, producer.approxLng], {
        icon: redDotIcon,
        title: producer.productTitle,
      });

      marker.on("click", () => {
        setPhotoIdx(0);
        setActiveCardProducer(producer);
        map.panTo([producer.approxLat, producer.approxLng], { animate: true });
      });

      marker.addTo(layerGroup);
    });
  }, [
    producers,
    userCoords.lat,
    userCoords.lng,
    cityLabel,
    searchRadiusKm,
    activeCardProducer,
  ]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([userCoords.lat, userCoords.lng], 13, { animate: true });
  };

  const activePhotos =
    activeCardProducer?.photos && activeCardProducer.photos.length > 0
      ? activeCardProducer.photos
      : [];

  const isActiveSaved = activeCardProducer
    ? savedIds.includes(activeCardProducer.id)
    : false;

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-xl bg-[#EFEFEA] shadow-[0_2px_10px_rgba(19,21,12,0.04)] sm:h-[540px]">
      <div ref={mapContainerRef} className="z-0 h-full w-full" />

      {/* Controles flotantes */}
      <div className="pointer-events-none absolute left-3 right-14 top-3 z-[400] flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-[#FFFFFF]/95 px-3 py-1.5 text-xs font-medium text-[#13150C] shadow-[0_2px_10px_rgba(19,21,12,0.08)] backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D9383A]" />
          <span>{producers.length} en el radar</span>
        </div>

        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF]/95 p-1 shadow-[0_2px_10px_rgba(19,21,12,0.08)] backdrop-blur-md">
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => onChangeRadius(km)}
              className={[
                "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                searchRadiusKm === km
                  ? "bg-[#2B4628] text-[#F7F7F4]"
                  : "text-[#6E6D5F] hover:text-[#13150C]",
              ].join(" ")}
            >
              {km} km
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRecenter}
          className="pointer-events-auto inline-flex items-center rounded-lg bg-[#FFFFFF]/95 px-3 py-1.5 text-xs font-semibold text-[#2B4628] shadow-[0_2px_10px_rgba(19,21,12,0.08)] transition-colors hover:bg-white"
        >
          Centrar
        </button>
      </div>

      {/* Tarjeta Flotante al tocar una bolita roja */}
      {activeCardProducer && (
        <div className="absolute inset-x-3 bottom-3 z-[450] mx-auto max-w-[430px] overflow-hidden rounded-xl bg-[#FFFFFF] shadow-[0_14px_38px_rgba(19,21,12,0.2)]">
          {activePhotos.length > 0 && (
            <div className="relative h-32 w-full bg-[#EFEFEA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhotos[photoIdx % activePhotos.length]}
                alt={activeCardProducer.productTitle}
                className="h-full w-full object-cover"
              />
              {activePhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIdx(
                        (prev) =>
                          (prev - 1 + activePhotos.length) % activePhotos.length
                      )
                    }
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-transparent p-1.5 text-white/80 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIdx((prev) => (prev + 1) % activePhotos.length)
                    }
                    aria-label="Siguiente foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent p-1.5 text-white/80 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2.5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    activeCardProducer.freshnessStatus === "confirmed"
                      ? "bg-[#1F3A26] text-[#F4F7F4]"
                      : "bg-[#F2DCDC] text-[#7A2727]",
                  ].join(" ")}
                >
                  {activeCardProducer.freshnessLabel}
                </span>

                <span className="inline-flex items-center gap-1 text-xs text-[#6E6D5F]">
                  <Star
                    className="h-3.5 w-3.5 text-[#C88A1E]"
                    fill="currentColor"
                    strokeWidth={1.6}
                  />
                  <span>
                    {activeCardProducer.avgRating.toFixed(1)} (
                    {activeCardProducer.reviewsCount})
                    {activeCardProducer.completedSalesCount > 0
                      ? ` · ${activeCardProducer.completedSalesCount} ${
                          activeCardProducer.completedSalesCount === 1
                            ? "entrega"
                            : "entregas"
                        }`
                      : ""}
                  </span>
                </span>

                <span className="text-xs text-[#6E6D5F]">
                  · {activeCardProducer.distanceKm} km
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleSave(activeCardProducer.id)}
                  aria-label="Favorito"
                  className={[
                    "bg-transparent p-1.5 transition-colors",
                    isActiveSaved
                      ? "text-[#1F3A26]"
                      : "text-[#13150C]/55 hover:text-[#13150C]",
                  ].join(" ")}
                >
                  <Bookmark
                    className="h-4 w-4"
                    strokeWidth={1.6}
                    fill={isActiveSaved ? "currentColor" : "none"}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCardProducer(null)}
                  aria-label="Cerrar tarjeta del mapa"
                  className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[15px] font-medium leading-snug text-[#13150C]">
                {activeCardProducer.productTitle}
              </h3>
              <button
                type="button"
                onClick={() =>
                  onOpenSellerProfile(activeCardProducer.producerName)
                }
                className="mt-0.5 inline-block text-xs font-medium text-[#2B4628] hover:underline"
              >
                {activeCardProducer.producerName}
              </button>
            </div>

            <div className="space-y-0.5 rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs text-[#6E6D5F]">
              <p className="truncate font-medium text-[#13150C]">
                {activeCardProducer.meetingPoint}
              </p>
              <p className="truncate">{activeCardProducer.scheduleToday}</p>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onSelectProducer(activeCardProducer)}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#EFEFEA] px-3 text-sm font-medium text-[#13150C] transition-colors hover:bg-[#F7F7F4]"
              >
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => onOpenChatWithBusiness(activeCardProducer)}
                className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#2B4628] px-3 text-sm font-medium text-[#F7F7F4] transition-colors hover:bg-[#223820]"
              >
                Enviar mensaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
