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
