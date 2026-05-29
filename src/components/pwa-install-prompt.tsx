"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-3xl bg-white p-5 shadow-[0_8px_32px_rgba(124,58,237,0.18)]">
        <p className="text-base font-bold text-[#1e1b4b]">
          Installer Courses
        </p>
        <p className="mt-1 text-sm text-[#1e1b4b]/70">
          Ajoutez l&apos;application sur votre ecran d&apos;accueil pour un
          acces rapide.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border-2 border-[#7c3aed]/20 px-4 py-2.5 text-sm font-semibold text-[#7c3aed] transition-colors hover:bg-[#7c3aed]/5"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#5b21b6] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_0_#5b21b6]"
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
