"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-[#1e1b4b] px-4 py-2 text-[12px] font-bold text-white">
      <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
      Hors connexion — les donnees affichees peuvent ne pas etre a jour
    </div>
  );
}
