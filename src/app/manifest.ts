import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Courses — Gestion de cours de soutien",
    short_name: "Courses",
    description: "Application de gestion de cours de soutien en Algerie",
    start_url: "/",
    display: "standalone",
    background_color: "#f0ecff",
    theme_color: "#7c3aed",
    orientation: "portrait",
    shortcuts: [
      {
        name: "Tableau de bord",
        short_name: "Dashboard",
        url: "/fr/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Faire l'appel",
        short_name: "Appel",
        url: "/fr/attendance",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Paiements",
        short_name: "Paiements",
        url: "/fr/payments",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Eleves",
        short_name: "Eleves",
        url: "/fr/students",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
