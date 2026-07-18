"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

const APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";

let loaded = false;

export function OneSignalProvider() {
  useEffect(() => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      OneSignal.login(user.id);
      OneSignal.User.addTags({
        role: user.user_metadata?.role || "",
        user_id: user.id,
      });

      if (!OneSignal.Notifications.permission) {
        OneSignal.Notifications.requestPermission();
      }
    });
  }, []);

  return null;
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}
