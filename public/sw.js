// Ancien nom du service worker (versions <= courses-v6). Certains navigateurs
// ont encore /sw.js enregistre : on delegue au worker officiel pour qu ils
// beneficient quand meme de l ecran hors ligne au lieu de la page d erreur du
// navigateur. La logique vit dans un seul fichier : OneSignalSDKWorker.js.
importScripts("/OneSignalSDKWorker.js");
