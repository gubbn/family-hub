import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Family Hub",
    short_name: "Family Hub",
    description: "A shared home for family meals, routines, chores, and plans.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#f1f5f9",
    orientation: "any",
    categories: ["lifestyle", "productivity"],
  };
}
