"use client";

import React from "react";
import {
  Compass,
  Bookmark,
  MessageSquare,
  Store,
  User,
} from "lucide-react";

export type BottomNavTab =
  | "radar"
  | "saved"
  | "chats"
  | "seller"
  | "profile";

interface BottomNavProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
  savedCount: number;
  showSellerTab: boolean;
  hasUnreadChat?: boolean;
}

export function BottomNav({
  activeTab,
  onChangeTab,
  savedCount,
  showSellerTab,
  hasUnreadChat = false,
}: BottomNavProps) {
  const navItems: Array<{
    id: BottomNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    { id: "radar", label: "Explorar", icon: Compass },
    { id: "saved", label: "Guardados", icon: Bookmark },
    { id: "chats", label: "Chats", icon: MessageSquare },
    ...(showSellerTab
      ? [{ id: "seller" as const, label: "Mi puesto", icon: Store }]
      : []),
    { id: "profile", label: "Perfil", icon: User },
  ];

  return (
    <nav
      aria-label="Navegación principal inferior"
      className="z-30 shrink-0 bg-[#FFFFFF] px-2 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(19,21,12,0.04)]"
    >
      <div
        className={`mx-auto grid max-w-[420px] gap-1 ${
          showSellerTab ? "grid-cols-5" : "grid-cols-4"
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
                "relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors outline-none focus:outline-none",
                isActive
                  ? "text-[#2B4628]"
                  : "text-[#6E6D5F] hover:text-[#13150C]",
              ].join(" ")}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-3 right-3 top-0 h-[2px] rounded-sm bg-[#2B4628]"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon className="h-4 w-4" strokeWidth={1.6} />
                {item.id === "saved" && savedCount > 0 && (
                  <span className="absolute -right-2.5 -top-1 text-[10px] font-semibold text-[#2B4628]">
                    {savedCount}
                  </span>
                )}
                {item.id === "chats" && hasUnreadChat && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-[#D9383A]" />
                )}
              </div>

              <span
                className={[
                  "text-[11px]",
                  isActive
                    ? "font-semibold text-[#2B4628]"
                    : "font-medium text-[#6E6D5F]",
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
