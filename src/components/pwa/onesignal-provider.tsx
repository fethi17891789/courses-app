"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

const APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";
const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

let sdkLoaded = false;
let loggedInUserId = "";

function loadSdk(attempt = 1) {
  if (sdkLoaded) return;
  sdkLoaded = true;
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  const script = document.createElement("script");
  script.src = SDK_URL;
  script.defer = true;
  script.onerror = () => {
    console.warn("[OS] SDK failed to load (attempt", attempt + ")");
    sdkLoaded = false;
    script.remove();
    if (attempt < 3) {
      setTimeout(() => loadSdk(attempt + 1), 3000 * attempt);
    }
  };
  document.head.appendChild(script);

  window.OneSignalDeferred.push(async (OneSignal: any) => {
    console.log("[OS] SDK init start");
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/sw.js",
    });
    console.log("[OS] SDK init done, permission:", OneSignal.Notifications.permission);
  });
}

function loginUser(userId: string, role: string) {
  console.log("[OS] loginUser called, userId:", userId, "already:", loggedInUserId);
  if (loggedInUserId === userId) return;
  loggedInUserId = userId;

  const doLogin = async (OneSignal: any) => {
    console.log("[OS] doLogin executing for", userId);
    try {
      await OneSignal.login(userId);
      console.log("[OS] login() success for", userId);
    } catch (e) {
      console.error("[OS] login() error:", e);
    }
    OneSignal.User.addTags({ role, user_id: userId });

    const hasPermission = OneSignal.Notifications.permission;
    const isOptedIn = OneSignal.User.PushSubscription.optedIn;
    console.log("[OS] permission:", hasPermission, "optedIn:", isOptedIn);

    if (hasPermission && !isOptedIn) {
      console.log("[OS] permission granted but not subscribed, opting in...");
      await OneSignal.User.PushSubscription.optIn();
      console.log("[OS] optIn() done");
    } else if (!hasPermission) {
      console.log("[OS] requesting permission...");
      OneSignal.Notifications.requestPermission();
    }
  };

  const os = (window as any).OneSignal;
  console.log("[OS] window.OneSignal exists?", !!os);
  if (os) {
    doLogin(os).catch((e: any) => console.error("[OS] doLogin catch:", e));
  } else {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(doLogin);
    console.log("[OS] pushed to deferred queue, length:", window.OneSignalDeferred.length);
  }
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
