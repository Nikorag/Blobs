import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blobs",
    short_name: "Blobs",
    description: "The trick-calling card game.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e2a",
    theme_color: "#0a0e2a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
