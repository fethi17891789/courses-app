"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function PremiumGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes("/login")) return;

    let cancelled = false;

    async function check() {
      const res = await fetch("/api/auth/premium");
      if (cancelled) return;
      const data = await res.json();

      if (data.premium === false) {
        const supabase = createClient();
        await supabase.auth.signOut();
        const locale = pathname.startsWith("/ar") ? "ar" : "fr";
        window.location.href = `/${locale}/login?expired=true`;
      }
    }

    check();
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
