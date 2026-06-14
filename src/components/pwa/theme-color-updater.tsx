"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ROUTE_COLORS: Record<string, string> = {
  "/attendance": "#22c55e",
  "/payments": "#f97316",
  "/students": "#f59e0b",
  "/quiz": "#7c3aed",
  "/groups": "#7c3aed",
  "/schedule": "#7c3aed",
  "/announcements": "#7c3aed",
  "/settings": "#7c3aed",
  "/dashboard": "#7c3aed",
};

const DEFAULT_COLOR = "#7c3aed";

function getThemeColor(pathname: string): string {
  for (const [route, color] of Object.entries(ROUTE_COLORS)) {
    if (pathname.includes(route)) return color;
  }
  return DEFAULT_COLOR;
}

export function ThemeColorUpdater() {
  const pathname = usePathname();

  useEffect(() => {
    const color = getThemeColor(pathname);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [pathname]);

  return null;
}
