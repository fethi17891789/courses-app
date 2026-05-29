"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BannerMode = "native" | "manual" | null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getManualInstructions(): {
  browser: string;
  steps: string;
} | null {
  const ua = navigator.userAgent;

  if (/OPR|Opera/i.test(ua)) {
    return {
      browser: "Opera / Opera GX",
      steps:
        'Ouvrez le menu (3 points en haut a droite), puis cliquez sur "Installer en tant qu\'application".',
    };
  }

  if (/Firefox/i.test(ua)) {
    return {
      browser: "Firefox",
      steps:
        'Ouvrez le menu, puis cliquez sur "Installer cette application" ou "Ajouter a l\'ecran d\'accueil".',
    };
  }

  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return {
      browser: "Safari",
      steps:
        'Appuyez sur le bouton Partager, puis "Sur l\'ecran d\'accueil".',
    };
  }

  return null;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [bannerMode, setBannerMode] = useState<BannerMode>(null);
  const [manualInfo, setManualInfo] = useState<{
    browser: string;
    steps: string;
  } | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    let promptFired = false;

    const handler = (e: Event) => {
      e.preventDefault();
      promptFired = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setBannerMode("native");
    };

    window.addEventListener("beforeinstallprompt", handler);

    const timeout = setTimeout(() => {
      if (!promptFired) {
        const info = getManualInstructions();
        if (info) {
          setManualInfo(info);
          setBannerMode("manual");
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setBannerMode(null);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setBannerMode(null);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!bannerMode) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-3xl bg-white p-5 shadow-[0_8px_32px_rgba(124,58,237,0.18)]">
        <p className="text-base font-bold text-[#1e1b4b]">
          Installer Courses
        </p>

        {bannerMode === "native" ? (
          <>
            <p className="mt-1 text-sm text-[#1e1b4b]/70">
              Ajoutez l&apos;application sur votre ecran d&apos;accueil pour
              un acces rapide.
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
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-[#1e1b4b]/70">
              Sur <span className="font-semibold">{manualInfo?.browser}</span>
              &nbsp;: {manualInfo?.steps}
            </p>
            <div className="mt-4">
              <button
                onClick={handleDismiss}
                className="w-full rounded-xl border-2 border-[#7c3aed]/20 px-4 py-2.5 text-sm font-semibold text-[#7c3aed] transition-colors hover:bg-[#7c3aed]/5"
              >
                Compris
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
