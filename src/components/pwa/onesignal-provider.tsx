"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

const APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";

let sdkLoaded = false;
let loggedInUserId = "";

function loadSdk() {
  if (sdkLoaded) return;
  sdkLoaded = true;
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
  });
}

function loginUser(userId: string, role: string) {
  if (loggedInUserId === userId) return;
  loggedInUserId = userId;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.login(userId);
    OneSignal.User.addTags({ role, user_id: userId });
    if (!OneSignal.Notifications.permission) {
      OneSignal.Notifications.requestPermission();
    }
  });
}

export function OneSignalProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    loadSdk();

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loginUser(user.id, user.user_metadata?.role || "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loginUser(session.user.id, session.user.user_metadata?.role || "");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}
