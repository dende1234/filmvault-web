import type { MetadataRoute } from "next";

/** Makes Filmory installable ("Zet op beginscherm"): own icon, no address
 * bar. Colors are the dark theme's background and accent (app/globals.css). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filmory",
    short_name: "Filmory",
    description: "Je dvd-, Blu-ray- en 4K-collectie altijd bij de hand, met barcode scannen.",
    id: "/",
    start_url: "/dashboard?ref=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    lang: "nl",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
