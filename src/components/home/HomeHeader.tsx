"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { UserRole, getInitials } from "@/components/auth/validators";
import { AppNotification } from "@/lib/businesses";

export type ActiveWorkspaceMode = "buyer" | "seller";

interface HomeHeaderProps {
  userName: string;
  userAvatar?: string;
  isVerified?: boolean;
  role: UserRole;
  cityLabel: string;
  isLocating: boolean;
  onRefreshLocation: () => void;
  activeWorkspace: ActiveWorkspaceMode;
  onChangeWorkspace: (mode: ActiveWorkspaceMode) => void;
  notifications: AppNotification[];
  onMarkNotificationsRead: () => void;
  onOpenProfile: () => void;
}

export function HomeHeader({
  userName,
  userAvatar,
  isVerified,
  role,
  cityLabel,
  isLocating,
  onRefreshLocation,
  activeWorkspace,
  onChangeWorkspace,
  notifications,
  onMarkNotificationsRead,
  onOpenProfile,
}: HomeHeaderProps) {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const firstName = userName.trim().split(/\s+/)[0] || "Alex";
  const canAccessSellerPanel = role === "seller" || role === "both";
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="relative space-y-3 pb-2">
      {/* Top Navbar */}
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 focus:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="NAFE"
            className="h-8 w-auto object-contain"
          />
          <span className="text-sm font-semibold tracking-[0.16em] text-[#13150C]">
            NAFE
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {/* Ubicación Real `haru` (Solo texto limpio) */}
          <button
            type="button"
            onClick={onRefreshLocation}
            disabled={isLocating}
            className="inline-flex h-8 min-w-0 items-center rounded-lg bg-[#EFEFEA] px-2.5 text-xs font-medium text-[#13150C] transition-colors hover:bg-[#FFFFFF] sm:px-3"
          >
            <span className="max-w-[125px] truncate sm:max-w-[220px]">
              {isLocating ? "Ubicando…" : cityLabel}
            </span>
          </button>

          {/* Campana de Notificaciones (SIN caja de fondo) */}
          <button
            type="button"
            onClick={() => {
              setShowNotifMenu((prev) => !prev);
              if (unreadCount > 0) onMarkNotificationsRead();
            }}
            aria-label="Notificaciones"
            className="relative bg-transparent p-1.5 text-[#13150C]/70 transition-colors hover:text-[#13150C]"
          >
            <Bell className="h-4 w-4" strokeWidth={1.6} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#D9383A]" />
            )}
          </button>

          {/* Foto de perfil del usuario (`lily`) */}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Perfil"
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2B4628] text-xs font-semibold text-[#F7F7F4]"
          >
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{getInitials(userName)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Popover de Notificaciones */}
      <AnimatePresence>
        {showNotifMenu && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-2 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_8px_28px_rgba(19,21,12,0.08)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#13150C]">
                Notificaciones
              </span>
              <button
                type="button"
                onClick={() => setShowNotifMenu(false)}
                aria-label="Cerrar notificaciones"
                className="bg-transparent p-1.5 text-[#13150C]/55 transition-colors hover:text-[#13150C]"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#6E6D5F]">Sin notificaciones</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg bg-[#EFEFEA] px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-[#13150C]">{n.title}</p>
                    <p className="mt-0.5 text-[#6E6D5F]">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saludo Principal Centrado en Newsreader + Selector de Modo debajo */}
      <div className="flex flex-col items-center gap-2.5 pt-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h1 className="font-serif text-2xl font-medium leading-tight tracking-[-0.015em] text-[#13150C]/85">
            Hola, <span className="italic">{firstName}</span>
          </h1>
          {isVerified && (
            <span className="inline-flex items-center rounded-md bg-[#1F3A26] px-2 py-0.5 text-xs font-medium text-[#F4F7F4]">
              Verificado
            </span>
          )}
        </div>

        {canAccessSellerPanel && (
          <div
            className="grid w-full max-w-[260px] grid-cols-2 items-center gap-1 rounded-lg bg-[#EFEFEA] p-1"
            role="tablist"
            aria-label="Modo de vista"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspace === "buyer"}
              onClick={() => onChangeWorkspace("buyer")}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                activeWorkspace === "buyer"
                  ? "bg-[#2B4628] text-[#F7F7F4]"
                  : "text-[#6E6D5F] hover:text-[#13150C]",
              ].join(" ")}
            >
              Explorar
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeWorkspace === "seller"}
              onClick={() => onChangeWorkspace("seller")}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                activeWorkspace === "seller"
                  ? "bg-[#2B4628] text-[#F7F7F4]"
                  : "text-[#6E6D5F] hover:text-[#13150C]",
              ].join(" ")}
            >
              Mi puesto
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
