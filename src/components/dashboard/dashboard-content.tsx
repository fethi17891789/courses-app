"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function DashboardContent({ user }: { user: User }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f0ecff] font-[family-name:var(--font-sans)]">
      <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-5 pb-8 pt-10">
        <div className="absolute -top-12 h-40 w-40 rounded-full opacity-30" style={{ right: "-3rem", background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)" }} />
        <div className="relative z-10">
          <p className="text-[13px] font-semibold text-white/70">
            {t("title")}
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold text-white">
            {t("welcome", { name: fullName })}
          </h1>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_16px_48px_-12px_rgba(30,27,75,0.1)]">
          <p className="text-center text-[14px] font-semibold text-[#1e1b4b]/60">
            {user.user_metadata?.role === "prof"
              ? "Espace professeur"
              : user.user_metadata?.role === "eleve"
                ? "Espace eleve"
                : "Espace parent"}
          </p>
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-[14px] font-extrabold text-red-500 shadow-[0_3px_0_#fecaca] transition-all duration-[80ms] active:translate-y-[2px] active:shadow-[0_1px_0_#fecaca]"
        >
          {t("logoutCta")}
        </button>
      </div>
    </main>
  );
}
