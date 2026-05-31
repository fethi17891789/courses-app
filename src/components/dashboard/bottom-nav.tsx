"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

type NavItem = {
  id: string;
  route: string;
  icon: () => React.ReactNode;
};

const items: NavItem[] = [
  {
    id: "home",
    route: "/dashboard",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    id: "groups",
    route: "/groups",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "students",
    route: "/students",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "payments",
    route: "/payments",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "settings",
    route: "/settings",
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function BottomNav({
  active = "home",
}: {
  active?: string;
}) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    for (const item of items) {
      router.prefetch(`/${locale}${item.route}`);
    }
  }, [locale, router]);

  function handleNavigate(item: NavItem) {
    if (item.id === active) return;
    router.push(`/${locale}${item.route}`);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-5 pt-2" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
      <div
        className="relative mx-auto flex max-w-md items-center justify-around rounded-xl bg-white px-3 py-3"
        style={{
          boxShadow: "0 5px 0 #ddd6fe, 0 16px 48px -12px rgba(30,27,75,0.15)",
        }}
      >
        {items.map((item) => {
          const isActive = active === item.id;
          const isPressed = pressedId === item.id;

          return (
            <button
              key={item.id}
              onPointerDown={() => {
                setPressedId(item.id);
                handleNavigate(item);
              }}
              onPointerUp={() => setPressedId(null)}
              onPointerLeave={() => setPressedId(null)}
              className="relative overflow-hidden flex h-12 w-12 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms] ease-out focus-visible:outline-none"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                  : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                color: isActive ? "#ffffff" : "#1e1b4b80",
                transform: `translateY(${
                  isActive || isPressed ? 3 : 0
                }px)`,
                boxShadow:
                  isActive || isPressed
                    ? isActive
                      ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                      : "0 0px 0 #c4b5fd, 0 1px 3px -1px rgba(124,58,237,0.2)"
                    : "0 3px 0 #ddd6fe, 0 6px 16px -4px rgba(124,58,237,0.15)",
              }}
            >
              {item.icon()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
