"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BottomNav } from "./bottom-nav";

const ROUTE_TO_TAB: Record<string, string> = {
  "/dashboard": "home",
  "/groups": "groups",
  "/students": "students",
  "/payments": "payments",
  "/settings": "settings",
  "/attendance": "home",
  "/schedule": "home",
  "/subjects": "subjects",
  "/quiz": "home",
  "/join": "join",
  "/announcements": "announcements",
  "/student/schedule": "home",
  "/student/history": "settings",
};

const HIDDEN_ROUTES = ["/login", "/reset-password", "/legal"];

function deriveActive(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(fr|ar)/, "") || "/";
  for (const route of Object.keys(ROUTE_TO_TAB).sort(
    (a, b) => b.length - a.length,
  )) {
    if (withoutLocale === route || withoutLocale.startsWith(route + "/")) {
      return ROUTE_TO_TAB[route];
    }
  }
  return "home";
}

function shouldHide(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(fr|ar)/, "") || "/";
  return (
    withoutLocale === "/" ||
    HIDDEN_ROUTES.some(
      (r) => withoutLocale === r || withoutLocale.startsWith(r + "/"),
    )
  );
}

export function PersistentNav({
  initialRole = null,
}: {
  initialRole?: string | null;
}) {
  const pathname = usePathname();
  // Le role vient du serveur (claims du JWT) : plus de `getUser()` client au
  // montage, et la barre est peinte des le premier rendu au lieu de clignoter.
  const [role, setRole] = useState<string | null>(initialRole);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setRole(session.user.user_metadata?.role || "prof");
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!role || shouldHide(pathname)) return null;

  return <BottomNav active={deriveActive(pathname)} role={role} />;
}
