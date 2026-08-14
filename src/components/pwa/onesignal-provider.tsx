"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

const APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";
const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

/**
 * Surface du SDK OneSignal reellement utilisee ici. Le SDK est charge par
 * balise script depuis leur CDN, sans paquet npm : il n'apporte donc aucun
 * type. On decrit le minimum plutot que de manipuler du `any`.
 */
type OneSignalSdk = {
  init: (options: {
    appId: string;
    allowLocalhostAsSecureOrigin: boolean;
  }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
    addEventListener: (
      event: "foregroundWillDisplay",
      handler: (event: { notification?: { title?: string } }) => void,
    ) => void;
  };
};

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

  window.OneSignalDeferred.push(async (OneSignal: OneSignalSdk) => {
    console.log("[OS] SDK init start");
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    console.log("[OS] SDK init done, permission:", OneSignal.Notifications.permission);

    // Application au premier plan : on laisse la notification s'afficher.
    // Sans cet ecouteur, selon le navigateur, une notification recue pendant
    // que l'utilisateur regarde l'application peut etre avalee silencieusement.
    // On n'appelle deliberement PAS event.preventDefault().
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      (event) => {
        console.log("[OS] notification au premier plan:", event?.notification?.title);
      },
    );
  });
}

/**
 * Detache l'abonnement du compte qui vient de se deconnecter.
 *
 * Un abonnement push appartient au NAVIGATEUR, pas au compte. Sans ce logout,
 * il restait colle au compte precedent : sur un poste partage -- une salle des
 * profs -- le prof suivant recevait les notifications du precedent, avec les
 * noms de ses eleves. C'est aussi ce qui embrouillait les tests quand on
 * alternait entre un compte prof et un compte eleve sur le meme appareil.
 */
function logoutUser() {
  if (!loggedInUserId) return;
  console.log("[OS] logout de", loggedInUserId);
  loggedInUserId = "";

  const run = async (OneSignal: OneSignalSdk) => {
    try {
      await OneSignal.logout();
      console.log("[OS] logout() success");
    } catch (e) {
      console.error("[OS] logout() error:", e);
    }
  };

  const os = (window as unknown as { OneSignal?: OneSignalSdk }).OneSignal;
  if (os) {
    run(os).catch(() => {});
  } else {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(run);
  }
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
    const token = OneSignal.User.PushSubscription.token;
    console.log("[OS] permission:", hasPermission, "optedIn:", isOptedIn, "token:", token ? "yes" : "no");

    if (!hasPermission) {
      console.log("[OS] requesting permission...");
      await OneSignal.Notifications.requestPermission();
    }

    if (!isOptedIn || !token) {
      console.log("[OS] no subscription or missing token, opting in...");
      await OneSignal.User.PushSubscription.optIn();
      const newToken = OneSignal.User.PushSubscription.token;
      console.log("[OS] optIn() done, token:", newToken ? "yes" : "no");
    }

    // ETAT FINAL. La ligne "[OS] permission:" plus haut decrit l'etat AVANT
    // la demande d'autorisation : a la premiere connexion elle affiche
    // forcement false, ce qui prete a confusion. C'est CETTE ligne qui dit si
    // l'appareil est reellement capable de recevoir des notifications.
    console.log(
      "[OS] etat final -> permission:",
      OneSignal.Notifications.permission,
      "optedIn:",
      OneSignal.User.PushSubscription.optedIn,
      "token:",
      OneSignal.User.PushSubscription.token ? "yes" : "no",
    );
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
        } else {
          // Deconnexion : on detache l'abonnement du compte precedent, sinon il
          // lui reste rattache et le compte suivant recoit ses notifications.
          logoutUser();
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
