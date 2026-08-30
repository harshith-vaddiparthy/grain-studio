export type ProductExperience = "landing" | "studio";

export function experienceForPath(pathname: string): ProductExperience {
  return pathname === "/app" ? "studio" : "landing";
}

export function studioHref() {
  return "/app";
}
