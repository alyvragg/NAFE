"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Clock,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Bookmark,
  Store,
} from "lucide-react";
import { ProducerPost } from "@/data/mockProducers";
import { GeoCoordinates, openExternalUrl } from "@/lib/nativeBridge";

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
}: OsmRadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeCardProducer, setActiveCardProducer] =
    useState<ProducerPost | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  // Initialize Leaflet Map with OpenStreetMap Tiles
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

  // Re-center when userCoords update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([userCoords.lat, userCoords.lng], map.getZoom(), {
      animate: true,
    });
  }, [userCoords.lat, userCoords.lng]);

  // Render Search Radius Circle + User Beacon + Clean Red Dots for Producers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Subtle Search Radius Circle
    if (searchRadiusKm > 0) {
      L.circle([userCoords.lat, userCoords.lng], {
        radius: searchRadiusKm * 1000,
        color: "#3D562F",
        weight: 1.5,
        opacity: 0.45,
        fillColor: "#DBF7EC",
        fillOpacity: 0.14,
        dashArray: "6 6",
        interactive: false,
      }).addTo(layerGroup);
    }

    // 2. User current location marker (Forest Green dot)
    const userIcon = L.divIcon({
      className: "nafe-osm-user-marker",
      html: `
        <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(61,86,47,0.22);"></span>
          <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:#3D562F;border:2.5px solid #FFFFFF;box-shadow:0 2px 6px rgba(19,21,12,0.35);"></span>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([userCoords.lat, userCoords.lng], {
      icon: userIcon,
      title: `Tu ubicación (${cityLabel})`,
    }).addTo(layerGroup);

    // 3. Producer Red Dots (Bolitas Rojas limpias: #D9383A, 16px, borde blanco 2.5px, CERO textos encima)
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
            <span class="w-4 h-4 bg-[#D9383A] border-2 border-white shadow-md rounded-full" style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;background:#D9383A;border:2.5px solid #FFFFFF;transition:transform 0.18s ease;${ringHtml}"></span>
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

  const handleWhatsApp = (item: ProducerPost) => {
    const message = encodeURIComponent(
      `Hola ${item.producerName}, vi tu publicación de "${item.productTitle}" en el radar NAFE (a ${item.distanceKm} km). ¿Aún tienes disponible hoy en ${item.meetingPoint}?`
    );
    openExternalUrl(`https://wa.me/${item.whatsappContact}?text=${message}`);
  };

  const activePhotos =
    activeCardProducer?.photos && activeCardProducer.photos.length > 0
      ? activeCardProducer.photos
      : [
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
        ];

  const isActiveSaved = activeCardProducer
    ? savedIds.includes(activeCardProducer.id)
    : false;

  return (
    <div className="relative h-[460px] sm:h-[540px] w-full overflow-hidden rounded-xl border border-[#949172]/45 bg-[#DEDED8] shadow-xs">
      {/* OpenStreetMap Container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top Left Floating Controls: Count + Radius Selector + Re-center */}
      <div className="pointer-events-none absolute left-3 top-3 right-14 z-[400] flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-[#949172]/40 bg-[#DEDED8]/95 px-3 py-1.5 text-[12px] font-medium text-[#13150C] shadow-sm backdrop-blur-md">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-[#D9383A] shadow-xs" />
          <span>{producers.length} en el radar</span>
        </div>

        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-[#949172]/40 bg-[#DEDED8]/95 p-0.5 shadow-sm backdrop-blur-md">
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => onChangeRadius(km)}
              className={[
                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                searchRadiusKm === km
                  ? "bg-[#3D562F] text-[#DEDED8]"
                  : "text-[#13150C]/75 hover:bg-white/70",
              ].join(" ")}
            >
              {km} km
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRecenter}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-[#949172]/40 bg-white/95 px-2.5 py-1.5 text-[12px] font-semibold text-[#3D562F] shadow-sm transition-colors hover:bg-white"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Centrar</span>
        </button>
      </div>

      {/* Floating Producer Card with Photo Gallery when a Red Dot is tapped */}
      {activeCardProducer && (
        <div className="absolute inset-x-3 bottom-3 z-[450] mx-auto max-w-[430px] overflow-hidden rounded-xl border border-[#949172]/45 bg-[#DEDED8] shadow-[0_14px_38px_rgba(19,21,12,0.28)]">
          {/* Photo Gallery / Carousel */}
          <div className="relative h-40 w-full bg-[#13150C]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhotos[photoIdx % activePhotos.length]}
              alt={activeCardProducer.productTitle}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13150C]/75 via-transparent to-[#13150C]/30" />

            <div className="absolute inset-x-3 top-2.5 flex items-center justify-between gap-2">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold text-[#13150C] shadow-xs",
                  activeCardProducer.freshnessStatus === "confirmed"
                    ? "bg-[#DBF7EC]"
                    : "bg-[#F7DBDB]",
                ].join(" ")}
              >
                {activeCardProducer.freshnessLabel}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleSave(activeCardProducer.id)}
                  aria-label="Guardar productor"
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    isActiveSaved
                      ? "bg-[#DBF7EC] text-[#3D562F]"
                      : "bg-[#13150C]/65 text-white hover:bg-[#13150C]",
                  ].join(" ")}
                >
                  <Bookmark
                    className="h-4 w-4"
                    fill={isActiveSaved ? "currentColor" : "none"}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCardProducer(null)}
                  aria-label="Cerrar tarjeta del mapa"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#13150C]/65 text-white transition-colors hover:bg-[#13150C]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

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
                  className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#13150C]/60 text-white hover:bg-[#13150C]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIdx((prev) => (prev + 1) % activePhotos.length)
                  }
                  aria-label="Siguiente foto"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#13150C]/60 text-white hover:bg-[#13150C]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[11.5px] font-semibold text-white">
              <span className="rounded-md bg-[#3D562F] px-2 py-0.5 text-[#DEDED8]">
                {activeCardProducer.category}
              </span>
              <span className="rounded-md bg-[#13150C]/75 px-2 py-0.5">
                A {activeCardProducer.distanceKm} km de ti
              </span>
            </div>
          </div>

          {/* Card Content */}
          <div className="space-y-2.5 p-3.5">
            <div>
              <h3 className="font-serif text-[19px] font-medium leading-tight text-[#13150C]/80">
                {activeCardProducer.productTitle}
              </h3>
              <button
                type="button"
                onClick={() =>
                  onOpenSellerProfile(activeCardProducer.producerName)
                }
                className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3D562F] underline decoration-[#3D562F]/35 underline-offset-4 hover:text-[#2B3E21]"
              >
                <Store className="h-3.5 w-3.5" />
                <span>{activeCardProducer.producerName}</span>
              </button>
            </div>

            <div className="space-y-1 rounded-lg bg-white/70 px-3 py-2 text-[12px] text-[#13150C]/80">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#3D562F]" />
                <span className="truncate">
                  {activeCardProducer.meetingPoint}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#13150C]/65">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#949172]" />
                <span>{activeCardProducer.scheduleToday}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onSelectProducer(activeCardProducer)}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[#949172]/45 bg-white/80 px-3 text-[12.5px] font-semibold text-[#13150C] transition-colors hover:bg-white"
              >
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => handleWhatsApp(activeCardProducer)}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3D562F] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#334827]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
