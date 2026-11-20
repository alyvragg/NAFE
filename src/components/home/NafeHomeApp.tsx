"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserRole,
  LocalProfile,
  loadLocalProfile,
  saveLocalProfile,
  PROFILE_CHANGE_EVENT,
  getInitials,
} from "@/components/auth/validators";
import {
  ProducerPost,
  AppNotification,
  ChatConversation,
  fetchBusinessesFromSupabase,
  loadSavedBusinessIds,
  toggleSavedBusinessId,
  getOrCreateConversation,
  fetchNotifications,
  markNotificationsRead,
} from "@/lib/businesses";
import {
  supabase,
  updateProfileInSupabase,
  signOutFromSupabase,
} from "@/lib/supabase";
import { haru, DEFAULT_HARU_COORDS } from "@/lib/haru";
import { lily } from "@/lib/lily";
import {
  GeoCoordinates,
  triggerNativeStockNotification,
} from "@/lib/nativeBridge";
import {
  FavoriteStockAlert,
  requestStockAlertPermission,
  subscribeToFavoriteStockAlerts,
} from "@/lib/favoriteStockService";
import { usePlatform } from "@/lib/platform";
import { HomeHeader, ActiveWorkspaceMode } from "./HomeHeader";
import { BuyerRadarView } from "./BuyerRadarView";
import { ProducerPanelView } from "./ProducerPanelView";
import { ProducerDetailSheet } from "./ProducerDetailSheet";
import { SellerProfileSheet } from "./SellerProfileSheet";
import { LiveChatView } from "./LiveChatView";
import { SubscriptionModal } from "./SubscriptionModal";
import { BottomNav, BottomNavTab } from "./BottomNav";

const DEFAULT_PROFILE: LocalProfile = {
  name: "Alex",
  contact: "",
  role: "both",
  searchRadiusKm: 10,
  subscriptionTier: "free",
  isVerified: false,
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
  const [isOffline] = useState(false);

  // Real location state via `haru`
  const [userCoords, setUserCoords] = useState<GeoCoordinates>(
    DEFAULT_HARU_COORDS
  );
  const [cityLabel, setCityLabel] = useState<string>("Centro, Durango");
  const [isLocating, setIsLocating] = useState<boolean>(true);

  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);

  const [producers, setProducers] = useState<ProducerPost[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedProducer, setSelectedProducer] =
    useState<ProducerPost | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string | null>(
    null
  );

  // Live Chat & Subscription Modal state
  const [activeConversation, setActiveConversation] =
    useState<ChatConversation | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] =
    useState<boolean>(false);

  // Notifications & Avatar upload (`lily`) state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [liveStockToast, setLiveStockToast] =
    useState<FavoriteStockAlert | null>(null);
  const savedIdsRef = useRef<string[]>([]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    savedIdsRef.current = savedIds;
  }, [savedIds]);

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
    setSavedIds(loadSavedBusinessIds());

    window.addEventListener(PROFILE_CHANGE_EVENT, syncProfileFromStorage);
    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, syncProfileFromStorage);
    };
  }, [syncProfileFromStorage]);

  const refreshUserLocation = useCallback(async (forceRefresh = true) => {
    setIsLocating(true);
    try {
      const loc = await haru({ forceRefresh });
      setUserCoords({ lat: loc.lat, lng: loc.lng });
      setCityLabel(loc.cityLabel);
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    refreshUserLocation(false);
  }, [refreshUserLocation]);

  useEffect(() => {
    let active = true;
    const reloadBusinesses = () => {
      fetchBusinessesFromSupabase(
        isOffline,
        userCoords,
        searchRadiusKm,
        cityLabel
      ).then((list) => {
        if (active) setProducers(list);
      });
    };

    reloadBusinesses();

    // Sincronización en TIEMPO REAL (Empresa <-> Cliente en teléfono) vía Supabase Realtime
    const realtimeBusinessesChannel = supabase
      .channel("nafe-businesses-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "businesses",
        },
        () => {
          reloadBusinesses();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
        },
        () => {
          reloadBusinesses();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(realtimeBusinessesChannel);
    };
  }, [isOffline, userCoords, searchRadiusKm, cityLabel]);

  useEffect(() => {
    let active = true;
    fetchNotifications().then((items) => {
      if (active) setNotifications(items);
    });

    const channel = supabase
      .channel("nafe-stock-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (profile.userId && row.user_id && row.user_id !== profile.userId) {
            return;
          }
          const incoming: AppNotification = {
            id: String(row.id ?? `notif-${Date.now()}`),
            businessId: row.business_id ? String(row.business_id) : undefined,
            title: String(row.title ?? "Novedad en tu radar"),
            body: String(
              row.body ?? "Un negocio favorito actualizó su inventario."
            ),
            isRead: false,
            createdAt: String(row.created_at ?? new Date().toISOString()),
          };
          setNotifications((prev) => [incoming, ...prev]);
          triggerNativeStockNotification(incoming.title, incoming.body);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [profile.userId]);

  // Servicio en tiempo real: avisa cuando un negocio favorito marca que tiene stock
  useEffect(() => {
    let toastTimer: number | null = null;
    const unsubscribe = subscribeToFavoriteStockAlerts({
      getSavedIds: () => savedIdsRef.current,
      onAlert: (alert) => {
        setNotifications((prev) => [
          {
            id: alert.id,
            businessId: alert.businessId,
            title: alert.title,
            body: alert.body,
            isRead: false,
            createdAt: alert.createdAt,
          },
          ...prev,
        ]);
        setLiveStockToast(alert);
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
          setLiveStockToast(null);
        }, 6500);
      },
    });

    return () => {
      if (toastTimer) window.clearTimeout(toastTimer);
      unsubscribe();
    };
  }, []);

  const handleMarkNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markNotificationsRead();
  };

  // Execute mandatory `lily(file, userId)` profile photo uploader
  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const effectiveUserId = profile.userId || "local-user";
      const avatarUrl = await lily(file, effectiveUserId);
      const updated = await updateProfileInSupabase({ avatarUrl });
      setProfile(updated);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

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

  const handleToggleSave = async (id: string) => {
    const isCurrentlySaved = savedIds.includes(id);
    const nextIds = await toggleSavedBusinessId(id, savedIds);
    setSavedIds(nextIds);

    if (!isCurrentlySaved) {
      void requestStockAlertPermission();
      const target = producers.find((p) => p.id === id);
      if (target) {
        const previewNotif: AppNotification = {
          id: `fav-${Date.now()}`,
          businessId: target.id,
          title: `Guardaste ${target.producerName}`,
          body: `Recibirás aviso cuando publique stock de ${target.productTitle}.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [previewNotif, ...prev]);
      }
    }
  };

  const handleOpenChatWithBusiness = async (business: ProducerPost) => {
    setSelectedProducer(null);
    setSelectedSellerName(null);
    const conv = await getOrCreateConversation({
      businessId: business.id,
      businessName: business.productTitle,
      producerName: business.producerName,
    });
    setActiveConversation(conv);
    setActiveTab("chats");
  };

  const handleStockNotificationCreated = (title: string, body: string) => {
    setNotifications((prev) => [
      {
        id: `stock-${Date.now()}`,
        title,
        body,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleReviewSubmitted = (businessId: string, newRating: number) => {
    setProducers((prev) =>
      prev.map((item) => {
        if (item.id !== businessId) return item;
        const nextCount = item.reviewsCount + 1;
        const nextAvg =
          Number(
            (
              (item.avgRating * item.reviewsCount + newRating) /
              nextCount
            ).toFixed(1)
          ) || newRating;
        return {
          ...item,
          avgRating: nextAvg,
          reviewsCount: nextCount,
        };
      })
    );
    if (selectedProducer && selectedProducer.id === businessId) {
      setSelectedProducer((prev) => {
        if (!prev) return null;
        const nextCount = prev.reviewsCount + 1;
        const nextAvg =
          Number(
            (
              (prev.avgRating * prev.reviewsCount + newRating) /
              nextCount
            ).toFixed(1)
          ) || newRating;
        return {
          ...prev,
          avgRating: nextAvg,
          reviewsCount: nextCount,
        };
      });
    }
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
    if (selectedProducer && selectedProducer.id === postId) {
      setSelectedProducer((prev) => (prev ? { ...prev, ...patch } : null));
    }
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-3.5 pb-8"
    >
      {/* Resumen de Cuenta con Subida `lily` */}
      <section className="space-y-3.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#2B4628] text-sm font-semibold text-[#F7F7F4]"
            >
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{getInitials(profile.name)}</span>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight text-[#13150C]">
                {profile.name}
              </h2>
              {profile.isVerified && (
                <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
                  Verificado
                </span>
              )}
            </div>
            <p className="truncate text-xs text-[#6E6D5F]">
              {profile.contact || cityLabel}
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="mt-1.5 rounded-md bg-[#EFEFEA] px-2.5 py-1 text-xs font-medium text-[#13150C] transition-colors hover:bg-[#e5e5de]"
            >
              {isUploadingAvatar ? "Subiendo…" : "Cambiar foto"}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-name-input"
            className="mb-1 block text-xs font-medium text-[#6E6D5F]"
          >
            Nombre
          </label>
          <input
            id="profile-name-input"
            type="text"
            placeholder="Nombre"
            value={profile.name}
            onChange={(e) => {
              const next = { ...profile, name: e.target.value };
              setProfile(next);
              saveLocalProfile(next);
            }}
            onBlur={() => updateProfileInSupabase({ name: profile.name })}
            className="h-10 w-full rounded-lg bg-[#EFEFEA] px-3 text-sm text-[#13150C] outline-none focus:bg-[#FFFFFF]"
          />
        </div>
      </section>

      {/* Plan Actual */}
      <section className="flex items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#13150C]">Plan</span>
          <span className="rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
            {profile.subscriptionTier === "coop"
              ? "Cooperativa"
              : profile.subscriptionTier === "pro"
                ? "Cosecha"
                : "Semilla"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsSubscriptionModalOpen(true)}
          className="h-8 shrink-0 rounded-lg bg-[#EFEFEA] px-3 text-xs font-semibold text-[#13150C] transition-colors hover:bg-[#2B4628] hover:text-[#F7F7F4]"
        >
          Planes
        </button>
      </section>

      {/* Radio de búsqueda */}
      <section className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
        <h3 className="text-sm font-semibold text-[#13150C]">
          Radio de búsqueda
        </h3>

        <div className="grid grid-cols-4 gap-2">
          {RADIUS_CHOICES.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => handleRadiusChange(km)}
              className={[
                "h-9 rounded-lg text-xs font-semibold transition-colors",
                searchRadiusKm === km
                  ? "bg-[#2B4628] text-[#F7F7F4]"
                  : "bg-[#EFEFEA] text-[#13150C] hover:bg-[#e5e5de]",
              ].join(" ")}
            >
              {km} km
            </button>
          ))}
        </div>
      </section>

      {/* Selector de Rol (Cero cajas de íconos, cero subtítulos) */}
      <section className="space-y-2.5 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(19,21,12,0.04)]">
        <h3 className="text-sm font-semibold text-[#13150C]">Rol</h3>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "buyer" as const, title: "Comprador" },
              { id: "seller" as const, title: "Productor" },
              { id: "both" as const, title: "Ambos" },
            ]
          ).map((opt) => {
            const selected = profile.role === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleRoleChange(opt.id)}
                className={[
                  "h-10 rounded-lg px-3 text-xs font-semibold transition-colors",
                  selected
                    ? "bg-[#2B4628] text-[#F7F7F4]"
                    : "bg-[#EFEFEA] text-[#13150C] hover:bg-[#e5e5de]",
                ].join(" ")}
              >
                {opt.title}
              </button>
            );
          })}
        </div>
      </section>

      {/* Acciones de Sesión */}
      <div className="flex flex-col gap-2">
        {!hasStoredAccount && (
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#FFFFFF] px-5 text-sm font-medium text-[#13150C] shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-colors hover:bg-[#EFEFEA]"
          >
            Iniciar sesión
          </Link>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#F2DCDC] px-5 text-sm font-medium text-[#7A2727] transition-colors hover:bg-[#ebcaca]"
        >
          Cerrar sesión
        </button>
      </div>
    </motion.div>
  );

  const renderMainContent = (isDesktopView: boolean) => {
    if (activeTab === "profile") {
      return renderProfilePanel();
    }

    if (activeTab === "chats") {
      return (
        <LiveChatView
          userName={profile.name}
          userAvatar={profile.avatarUrl}
          userId={profile.userId}
          userRole={profile.role}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onSaleMetricsChanged={(businessId, completedDelta, verifiedDelta) => {
            setProducers((prev) =>
              prev.map((item) =>
                item.id === businessId
                  ? {
                      ...item,
                      completedSalesCount: Math.max(
                        0,
                        (item.completedSalesCount || 0) + completedDelta
                      ),
                      verifiedSalesCount: Math.max(
                        0,
                        (item.verifiedSalesCount || 0) + verifiedDelta
                      ),
                    }
                  : item
              )
            );
          }}
          onReviewSubmitted={handleReviewSubmitted}
        />
      );
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
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          onStockNotificationCreated={handleStockNotificationCreated}
        />
      );
    }

    if (activeTab === "saved") {
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
          onOpenChatWithBusiness={handleOpenChatWithBusiness}
          onlySaved
          isDesktop={isDesktopView}
        />
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
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          onStockNotificationCreated={handleStockNotificationCreated}
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
        onOpenChatWithBusiness={handleOpenChatWithBusiness}
        isDesktop={isDesktopView}
      />
    );
  };

  const renderLiveStockToast = () => (
    <AnimatePresence>
      {liveStockToast && (
        <motion.div
          key={liveStockToast.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-[420px] rounded-xl bg-[#1F3A26] p-3.5 text-[#F4F7F4] shadow-[0_12px_32px_rgba(19,21,12,0.28)]"
        >
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                const match = producers.find(
                  (p) => p.id === liveStockToast.businessId
                );
                if (match) setSelectedProducer(match);
                setLiveStockToast(null);
              }}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-xs font-semibold text-[#F4F7F4]">
                {liveStockToast.title}
              </p>
              <p className="mt-0.5 text-xs text-[#F4F7F4]/85">
                {liveStockToast.body}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setLiveStockToast(null)}
              className="shrink-0 text-xs font-medium text-[#F4F7F4]/75 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // 1. DESKTOP PC VIEW
  // ============================================================================
  if (platform === "pc") {
    return (
      <div className="min-h-dvh w-full bg-[#F7F7F4] text-[#13150C]">
        {renderLiveStockToast()}
        <div className="mx-auto flex min-h-dvh max-w-[1240px] flex-col justify-between px-6 py-5">
          <div>
            <HomeHeader
              userName={profile.name}
              userAvatar={profile.avatarUrl}
              isVerified={profile.isVerified}
              role={profile.role}
              cityLabel={cityLabel}
              isLocating={isLocating}
              onRefreshLocation={() => refreshUserLocation(true)}
              activeWorkspace={activeWorkspace}
              onChangeWorkspace={(mode) => {
                setActiveWorkspace(mode);
                setActiveTab(mode === "seller" ? "seller" : "radar");
              }}
              notifications={notifications}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onOpenProfile={() => setActiveTab("profile")}
            />

            {/* Barra de navegación de escritorio */}
            <div className="my-3 flex flex-wrap items-center justify-between gap-2 py-1.5">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "radar" as const, label: "Explorar" },
                    {
                      id: "saved" as const,
                      label: `Guardados (${savedIds.length})`,
                    },
                    { id: "chats" as const, label: "Chats" },
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
                        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
                        active
                          ? "bg-[#2B4628] text-[#F7F7F4]"
                          : "bg-[#FFFFFF] text-[#13150C] shadow-[0_2px_10px_rgba(19,21,12,0.04)] hover:bg-[#EFEFEA]",
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
                  className="rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-sm font-medium text-[#13150C] shadow-[0_2px_10px_rgba(19,21,12,0.04)] transition-colors hover:bg-[#EFEFEA]"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>

            <main className="pt-1">{renderMainContent(true)}</main>
          </div>

          <ProducerDetailSheet
            producer={selectedProducer}
            reviewerName={profile.name}
            onClose={() => setSelectedProducer(null)}
            isSaved={
              selectedProducer ? savedIds.includes(selectedProducer.id) : false
            }
            onToggleSave={handleToggleSave}
            onOpenSellerProfile={setSelectedSellerName}
            onOpenChat={handleOpenChatWithBusiness}
            onReviewSubmitted={handleReviewSubmitted}
          />

          <SellerProfileSheet
            producerName={selectedSellerName}
            allProducers={producers}
            onClose={() => setSelectedSellerName(null)}
            onSelectPost={setSelectedProducer}
          />

          <SubscriptionModal
            isOpen={isSubscriptionModalOpen}
            currentTier={profile.subscriptionTier || "free"}
            onClose={() => setIsSubscriptionModalOpen(false)}
            onUpgraded={setProfile}
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
          ? "flex h-full w-full flex-col overflow-hidden bg-[#F7F7F4]"
          : "flex min-h-dvh w-full items-center justify-center bg-[#EFEFEA] sm:p-4"
      }
    >
      {renderLiveStockToast()}
      <div
        className={
          forcedMobile
            ? "relative flex h-full w-full flex-col overflow-hidden bg-[#F7F7F4]"
            : "relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#F7F7F4] sm:h-[min(860px,94dvh)] sm:rounded-2xl sm:shadow-[0_24px_70px_rgba(19,21,12,0.16)]"
        }
      >
        <div className="shrink-0 bg-[#F7F7F4] px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <HomeHeader
            userName={profile.name}
            userAvatar={profile.avatarUrl}
            isVerified={profile.isVerified}
            role={profile.role}
            cityLabel={cityLabel}
            isLocating={isLocating}
            onRefreshLocation={() => refreshUserLocation(true)}
            activeWorkspace={activeWorkspace}
            onChangeWorkspace={(mode) => {
              setActiveWorkspace(mode);
              setActiveTab(mode === "seller" ? "seller" : "radar");
            }}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onOpenProfile={() => setActiveTab("profile")}
          />
        </div>

        <main className="nafe-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-2.5 pb-6">
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
          reviewerName={profile.name}
          onClose={() => setSelectedProducer(null)}
          isSaved={
            selectedProducer ? savedIds.includes(selectedProducer.id) : false
          }
          onToggleSave={handleToggleSave}
          onOpenSellerProfile={setSelectedSellerName}
          onOpenChat={handleOpenChatWithBusiness}
          onReviewSubmitted={handleReviewSubmitted}
        />

        <SellerProfileSheet
          producerName={selectedSellerName}
          allProducers={producers}
          onClose={() => setSelectedSellerName(null)}
          onSelectPost={setSelectedProducer}
        />

        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          currentTier={profile.subscriptionTier || "free"}
          onClose={() => setIsSubscriptionModalOpen(false)}
          onUpgraded={setProfile}
        />
      </div>
    </div>
  );
}
