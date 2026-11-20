"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingBasket,
  Sprout,
  HeartHandshake,
  LogOut,
  Check,
  ArrowLeft,
  Compass,
} from "lucide-react";
import {
  UserRole,
  LocalProfile,
  loadLocalProfile,
  saveLocalProfile,
  PROFILE_CHANGE_EVENT,
} from "@/components/auth/validators";
import {
  ProducerPost,
  INITIAL_MOCK_PRODUCERS,
  fetchProducerPostsFromSupabaseOrCache,
  loadSavedProducerIds,
  saveSavedProducerIds,
} from "@/data/mockProducers";
import {
  supabase,
  updateProfileInSupabase,
  signOutFromSupabase,
} from "@/lib/supabase";
import {
  DEFAULT_CENTER_COORDS,
  GeoCoordinates,
  getCurrentLocation,
  loadLastKnownLocation,
} from "@/lib/nativeBridge";
import { usePlatform } from "@/lib/platform";
import { HomeHeader, ActiveWorkspaceMode } from "./HomeHeader";
import { BuyerRadarView } from "./BuyerRadarView";
import { ProducerPanelView } from "./ProducerPanelView";
import { ProducerDetailSheet } from "./ProducerDetailSheet";
import { SellerProfileSheet } from "./SellerProfileSheet";
import { BottomNav, BottomNavTab } from "./BottomNav";

const DEFAULT_PROFILE: LocalProfile = {
  name: "Alex",
  contact: "",
  role: "both",
  searchRadiusKm: 10,
  authenticatedAt: "",
};

const RADIUS_CHOICES = [5, 10, 25, 50];

interface NafeHomeAppProps {
  forcedMobile?: boolean;
}

export function NafeHomeApp({ forcedMobile = false }: NafeHomeAppProps) {
  const router = useRouter();
  const { platform: detectedPlatform } = usePlatform();
  const platform = forcedMobile ? "mobile" : detectedPlatform;

  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [hasStoredAccount, setHasStoredAccount] = useState(false);
  const [activeWorkspace, setActiveWorkspace] =
    useState<ActiveWorkspaceMode>("buyer");
  const [activeTab, setActiveTab] = useState<BottomNavTab>("radar");
  const [isOffline, setIsOffline] = useState(false);

  // Real location state (instant cached restore + live GPS/IP/Nominatim refresh)
  const [userCoords, setUserCoords] = useState<GeoCoordinates>(
    DEFAULT_CENTER_COORDS
  );
  const [cityLabel, setCityLabel] = useState<string>("Centro, Durango");
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [isLocationFallback, setIsLocationFallback] = useState<boolean>(false);

  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);

  const [producers, setProducers] = useState<ProducerPost[]>(
    INITIAL_MOCK_PRODUCERS
  );
  const [savedIds, setSavedIds] = useState<string[]>([
    "11111111-1111-4111-8111-111111111101",
    "11111111-1111-4111-8111-111111111104",
  ]);
  const [selectedProducer, setSelectedProducer] =
    useState<ProducerPost | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string | null>(
    null
  );

  const syncProfileFromStorage = useCallback(() => {
    const loaded = loadLocalProfile();
    setHasStoredAccount(Boolean(loaded));
    const effective = loaded ?? DEFAULT_PROFILE;
    setProfile(effective);
    if (effective.searchRadiusKm) {
      setSearchRadiusKm(effective.searchRadiusKm);
    }
    if (effective.role === "seller") {
      setActiveWorkspace("seller");
    } else if (effective.role === "buyer") {
      setActiveWorkspace("buyer");
    }
  }, []);

  useEffect(() => {
    syncProfileFromStorage();
    setSavedIds(loadSavedProducerIds());

    window.addEventListener(PROFILE_CHANGE_EVENT, syncProfileFromStorage);
    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, syncProfileFromStorage);
    };
  }, [syncProfileFromStorage]);

  // Fast, guaranteed real location resolver (with manual refresh trigger)
  const refreshUserLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentLocation();
      setUserCoords(loc.coords);
      setCityLabel(loc.cityLabel);
      setIsLocationFallback(loc.isFallback);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({
              last_lat: loc.coords.lat,
              last_lng: loc.coords.lng,
              city_label: loc.cityLabel,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      } catch {
        // Ignore when offline
      }
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate instantly with last known location so UI never stalls
    const cachedLoc = loadLastKnownLocation();
    if (cachedLoc) {
      setUserCoords(cachedLoc.coords);
      setCityLabel(cachedLoc.cityLabel);
    }
    refreshUserLocation();
  }, [refreshUserLocation]);

  // Fetch from Supabase (or Rust/localStorage offline cache) and compute real Haversine distances
  useEffect(() => {
    let active = true;
    fetchProducerPostsFromSupabaseOrCache(
      isOffline,
      userCoords,
      searchRadiusKm
    ).then((list) => {
      if (active) setProducers(list);
    });
    return () => {
      active = false;
    };
  }, [isOffline, userCoords, searchRadiusKm]);

  const handleRoleChange = async (nextRole: UserRole) => {
    const updated = await updateProfileInSupabase({ role: nextRole });
    setProfile(updated);

    if (nextRole === "buyer") {
      setActiveWorkspace("buyer");
      if (activeTab === "seller") setActiveTab("radar");
    } else if (nextRole === "seller") {
      setActiveWorkspace("seller");
    }
  };

  const handleRadiusChange = async (nextRadius: number) => {
    setSearchRadiusKm(nextRadius);
    const updated = await updateProfileInSupabase({
      searchRadiusKm: nextRadius,
    });
    setProfile(updated);
  };

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      saveSavedProducerIds(next);
      return next;
    });
  };

  const handlePostCreated = (newPost: ProducerPost) => {
    setProducers((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (
    postId: string,
    patch: Partial<ProducerPost>
  ) => {
    setProducers((prev) =>
      prev.map((item) => (item.id === postId ? { ...item, ...patch } : item))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setProducers((prev) => prev.filter((item) => item.id !== postId));
  };

  const handleSignOut = async () => {
    await signOutFromSupabase();
    router.push("/");
  };

  const showSellerAccess = profile.role === "seller" || profile.role === "both";

  const myPublishedPosts = useMemo(() => {
    return producers.filter(
      (p) =>
        p.isUserPost ||
        (profile.userId && p.ownerId === profile.userId) ||
        (profile.stallName && p.producerName === profile.stallName)
    );
  }, [producers, profile.userId, profile.stallName]);

  const renderProfilePanel = () => (
    <motion.div
      key="profile-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24 }}
      className="space-y-4 pb-8"
    >
      {/* Account Summary Card */}
      <section className="rounded-xl border border-[#949172]/40 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-lg bg-[#3D562F] text-white">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-[24px] font-medium text-[#13150C]/80">
              {profile.name}
            </h2>
            <p className="truncate text-[13px] text-[#13150C]/65">
              {profile.contact || cityLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[#949172]/25 pt-3">
          <label
            htmlFor="profile-name-input"
            className="mb-1 block text-[12px] font-semibold text-[#13150C]/75"
          >
            Tu nombre en la comunidad
          </label>
          <input
            id="profile-name-input"
            type="text"
            value={profile.name}
            onChange={(e) => {
              const next = { ...profile, name: e.target.value };
              setProfile(next);
              saveLocalProfile(next);
            }}
            onBlur={() => updateProfileInSupabase({ name: profile.name })}
            className="h-[46px] w-full rounded-lg border border-[#949172]/40 bg-[#DEDED8]/50 px-3.5 text-[14px] text-[#13150C] outline-none focus:border-[#3D562F] focus:bg-white"
          />
        </div>
      </section>

      {/* Search Radius Selector (5, 10, 25, 50 km) */}
      <section className="rounded-xl border border-[#949172]/40 bg-white/80 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#3D562F]" />
          <h3 className="font-serif text-[20px] font-medium text-[#13150C]/80">
            Radio de búsqueda
          </h3>
        </div>
        <p className="text-[13px] text-[#13150C]/65">
          Ajusta la distancia máxima para explorar productores y oficios en tu
          radar.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {RADIUS_CHOICES.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => handleRadiusChange(km)}
              className={[
                "h-11 rounded-lg border text-[13.5px] font-semibold transition-colors",
                searchRadiusKm === km
                  ? "border-[#3D562F] bg-[#3D562F] text-[#DEDED8]"
                  : "border-[#949172]/40 bg-[#DEDED8]/45 text-[#13150C] hover:bg-white",
              ].join(" ")}
            >
              {km} km
            </button>
          ))}
        </div>
      </section>

      {/* Role Selector (Exclusively inside Profile) */}
      <section className="rounded-xl border border-[#949172]/40 bg-white/80 p-5 space-y-3">
        <div>
          <h3 className="font-serif text-[21px] font-medium text-[#13150C]/80">
            Tu rol en NAFE
          </h3>
          <p className="mt-0.5 text-[13px] text-[#13150C]/65">
            Elige cómo deseas participar en tu comunidad.
          </p>
        </div>

        <div className="space-y-2">
          {(
            [
              {
                id: "buyer" as const,
                title: "Comprador (Explorar cerca)",
                desc: "Buscador conversacional, lista y mapa con contacto directo.",
                icon: ShoppingBasket,
              },
              {
                id: "seller" as const,
                title: "Vendedor / Productor (Mi puesto)",
                desc: "Perfil de puesto, publicar cosecha con fotos reales y puente SMS.",
                icon: Sprout,
              },
              {
                id: "both" as const,
                title: "Ambos (Comprador y Productor)",
                desc: "Explora el radar y administra tu perfil y publicaciones de vendedor.",
                icon: HeartHandshake,
              },
            ]
          ).map((opt) => {
            const Icon = opt.icon;
            const selected = profile.role === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleRoleChange(opt.id)}
                className={[
                  "flex w-full items-center gap-3.5 rounded-xl border-2 p-3.5 text-left transition-all",
                  selected
                    ? "border-[#3D562F] bg-[#DBF7EC]"
                    : "border-[#949172]/35 bg-[#DEDED8]/40 hover:bg-white",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-[#3D562F] text-white"
                      : "bg-[#DEDED8] text-[#3D562F]",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-[14px] font-semibold text-[#13150C]">
                    {opt.title}
                  </span>
                  <span className="block text-[12px] text-[#13150C]/70">
                    {opt.desc}
                  </span>
                </div>
                {selected && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3D562F] text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Session Actions */}
      <div className="flex flex-col gap-2.5 pt-1">
        {!hasStoredAccount && (
          <Link
            href="/"
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-[#949172]/50 bg-white/75 px-5 text-[14px] font-semibold text-[#13150C] transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Iniciar sesión o crear cuenta</span>
          </Link>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#F7DBDB] px-5 text-[14px] font-semibold text-[#7A2B2B] transition-colors hover:bg-[#f2caca]"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </motion.div>
  );

  const renderMainContent = (isDesktopView: boolean) => {
    if (activeTab === "profile") {
      return renderProfilePanel();
    }

    if (activeTab === "seller" && showSellerAccess) {
      return (
        <ProducerPanelView
          profile={profile}
          userCoords={userCoords}
          isOffline={isOffline}
          myPosts={myPublishedPosts}
          onPostCreated={handlePostCreated}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
          onProfileUpdated={setProfile}
        />
      );
    }

    if (activeTab === "saved") {
      return (
        <div className="space-y-3">
          <div className="rounded-md border border-[#3D562F]/20 bg-[#DBF7EC]/80 px-4 py-3 text-[13px] font-medium text-[#13150C]">
            Productores y oficios guardados para consulta rápida incluso sin
            conexión.
          </div>
          <BuyerRadarView
            userName={profile.name}
            userCoords={userCoords}
            cityLabel={cityLabel}
            searchRadiusKm={searchRadiusKm}
            onChangeRadius={handleRadiusChange}
            producers={producers}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onSelectProducer={setSelectedProducer}
            onOpenSellerProfile={setSelectedSellerName}
            onlySaved
            isDesktop={isDesktopView}
          />
        </div>
      );
    }

    const effectiveWorkspace: ActiveWorkspaceMode =
      profile.role === "buyer"
        ? "buyer"
        : profile.role === "seller"
          ? "seller"
          : activeWorkspace;

    if (effectiveWorkspace === "seller") {
      return (
        <ProducerPanelView
          profile={profile}
          userCoords={userCoords}
          isOffline={isOffline}
          myPosts={myPublishedPosts}
          onPostCreated={handlePostCreated}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
          onProfileUpdated={setProfile}
        />
      );
    }

    return (
      <BuyerRadarView
        userName={profile.name}
        userCoords={userCoords}
        cityLabel={cityLabel}
        searchRadiusKm={searchRadiusKm}
        onChangeRadius={handleRadiusChange}
        producers={producers}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
        onSelectProducer={setSelectedProducer}
        onOpenSellerProfile={setSelectedSellerName}
        isDesktop={isDesktopView}
      />
    );
  };

  // ============================================================================
  // 1. DESKTOP PC VIEW
  // ============================================================================
  if (platform === "pc") {
    return (
      <div className="min-h-dvh w-full bg-[#DEDED8] text-[#13150C]">
        <div className="mx-auto flex min-h-dvh max-w-[1240px] flex-col justify-between px-6 py-5">
          <div>
            <HomeHeader
              userName={profile.name}
              role={profile.role}
              cityLabel={cityLabel}
              isLocating={isLocating}
              isLocationFallback={isLocationFallback}
              onRefreshLocation={refreshUserLocation}
              activeWorkspace={activeWorkspace}
              onChangeWorkspace={(mode) => {
                setActiveWorkspace(mode);
                setActiveTab(mode === "seller" ? "seller" : "radar");
              }}
              isOffline={isOffline}
              onToggleOffline={() => setIsOffline((prev) => !prev)}
            />

            {/* Clean Desktop Navigation Bar */}
            <div className="my-4 flex flex-wrap items-center justify-between gap-3 border-y border-[#949172]/30 py-3">
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: "radar" as const, label: "Explorar" },
                    {
                      id: "saved" as const,
                      label: `Guardados (${savedIds.length})`,
                    },
                    ...(showSellerAccess
                      ? [{ id: "seller" as const, label: "Mi puesto" }]
                      : []),
                    { id: "profile" as const, label: "Perfil" },
                  ]
                ).map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id === "radar") setActiveWorkspace("buyer");
                        if (item.id === "seller") setActiveWorkspace("seller");
                      }}
                      className={[
                        "rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all",
                        active
                          ? "bg-[#3D562F] text-[#DEDED8] shadow-2xs"
                          : "border border-[#949172]/40 bg-white/60 text-[#13150C] hover:bg-white",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {!hasStoredAccount && (
                <Link
                  href="/"
                  className="rounded-lg border border-[#949172]/45 bg-white/60 px-3.5 py-1.5 text-[13px] font-semibold text-[#13150C] transition-colors hover:border-[#3D562F] hover:bg-white"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>

            <main className="pt-2">{renderMainContent(true)}</main>
          </div>

          <ProducerDetailSheet
            producer={selectedProducer}
            onClose={() => setSelectedProducer(null)}
            isSaved={
              selectedProducer ? savedIds.includes(selectedProducer.id) : false
            }
            onToggleSave={handleToggleSave}
            onOpenSellerProfile={setSelectedSellerName}
          />

          <SellerProfileSheet
            producerName={selectedSellerName}
            allProducers={producers}
            onClose={() => setSelectedSellerName(null)}
            onSelectPost={setSelectedProducer}
          />
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. MOBILE / ANDROID TAURI APP SHELL (`max-w-[430px]`)
  // ============================================================================
  return (
    <div
      className={
        forcedMobile
          ? "flex h-full w-full flex-col overflow-hidden bg-[#DEDED8]"
          : "flex min-h-dvh w-full items-center justify-center bg-[#C9C8BE] sm:p-4"
      }
    >
      <div
        className={
          forcedMobile
            ? "relative flex h-full w-full flex-col overflow-hidden bg-[#DEDED8]"
            : "relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#DEDED8] sm:h-[min(860px,94dvh)] sm:rounded-2xl sm:shadow-[0_24px_70px_rgba(19,21,12,0.22)] sm:ring-1 sm:ring-[#13150C]/10"
        }
      >
        <div className="shrink-0 border-b border-[#949172]/25 bg-[#DEDED8] px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <HomeHeader
            userName={profile.name}
            role={profile.role}
            cityLabel={cityLabel}
            isLocating={isLocating}
            isLocationFallback={isLocationFallback}
            onRefreshLocation={refreshUserLocation}
            activeWorkspace={activeWorkspace}
            onChangeWorkspace={(mode) => {
              setActiveWorkspace(mode);
              setActiveTab(mode === "seller" ? "seller" : "radar");
            }}
            isOffline={isOffline}
            onToggleOffline={() => setIsOffline((prev) => !prev)}
          />
        </div>

        <main className="nafe-scroll flex-1 overflow-y-auto px-4 pt-4">
          <AnimatePresence mode="wait">
            {renderMainContent(false)}
          </AnimatePresence>
        </main>

        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            if (tab === "radar") setActiveWorkspace("buyer");
            if (tab === "seller") setActiveWorkspace("seller");
          }}
          savedCount={savedIds.length}
          showSellerTab={showSellerAccess}
        />

        <ProducerDetailSheet
          producer={selectedProducer}
          onClose={() => setSelectedProducer(null)}
          isSaved={
            selectedProducer ? savedIds.includes(selectedProducer.id) : false
          }
          onToggleSave={handleToggleSave}
          onOpenSellerProfile={setSelectedSellerName}
        />

        <SellerProfileSheet
          producerName={selectedSellerName}
          allProducers={producers}
          onClose={() => setSelectedSellerName(null)}
          onSelectPost={setSelectedProducer}
        />
      </div>
    </div>
  );
}
