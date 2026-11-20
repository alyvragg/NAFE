"use client";

import React from "react";
import { Compass, Bookmark, Store, User } from "lucide-react";

export type BottomNavTab = "radar" | "saved" | "seller" | "profile";

interface BottomNavProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
  savedCount: number;
  showSellerTab: boolean;
}

export function BottomNav({
  activeTab,
  onChangeTab,
  savedCount,
  showSellerTab,
}: BottomNavProps) {
  const navItems: Array<{
    id: BottomNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    { id: "radar", label: "Explorar", icon: Compass },
    { id: "saved", label: "Guardados", icon: Bookmark },
    ...(showSellerTab
      ? [{ id: "seller" as const, label: "Mi puesto", icon: Store }]
      : []),
    { id: "profile", label: "Perfil", icon: User },
  ];

  return (
    <nav
      aria-label="Navegación principal inferior"
      className="z-30 shrink-0 border-t border-[#949172]/30 bg-[#DEDED8]/95 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div
        className={`mx-auto grid max-w-[420px] gap-1 ${
          showSellerTab ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 transition-colors outline-none focus:outline-none",
                isActive ? "text-[#3D562F]" : "text-[#949172] hover:text-[#13150C]",
              ].join(" ")}
            >
              {/* Indicador superior sutil de 2px (SIN bordes negros alrededor del botón) */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-sm bg-[#3D562F]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {item.id === "saved" && savedCount > 0 && (
                  <span className="absolute -right-3 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#3D562F] px-1 text-[10px] font-bold text-white">
                    {savedCount}
                  </span>
                )}
              </div>

              <span
                className={[
                  "text-[11px]",
                  isActive
                    ? "font-semibold text-[#3D562F]"
                    : "font-medium text-[#949172]",
                ].join(" ")}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
