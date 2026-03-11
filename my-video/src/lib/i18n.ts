export type AppLanguage = "tr" | "en" | "de";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
};

export const translations = {
  tr: {
    nav: {
      createVideo: "Video Oluştur",
      dashboard: "Panel",
      myVideos: "Videolarım",
      templates: "Şablonlar",
      billing: "Faturalandırma",
      settings: "Ayarlar",
    },
    sidebar: {
      platform: "Yapay Zeka Video Üretim Platformu",
      notSignedIn: "Giriş yapılmadı",
      engine: "Motor: Remotion + AI",
      creditsInfo: "Plan limitleri ve kalan krediler burada görünür.",
      language: "Dil",
    },
  },
  en: {
    nav: {
      createVideo: "Create Video",
      dashboard: "Dashboard",
      myVideos: "My Videos",
      templates: "Templates",
      billing: "Billing",
      settings: "Settings",
    },
    sidebar: {
      platform: "AI Video Creation Platform",
      notSignedIn: "Not signed in",
      engine: "Engine: Remotion + AI",
      creditsInfo: "Plan limits and remaining credits are visible here.",
      language: "Language",
    },
  },
  de: {
    nav: {
      createVideo: "Video erstellen",
      dashboard: "Dashboard",
      myVideos: "Meine Videos",
      templates: "Vorlagen",
      billing: "Abrechnung",
      settings: "Einstellungen",
    },
    sidebar: {
      platform: "KI-Videoerstellungsplattform",
      notSignedIn: "Nicht angemeldet",
      engine: "Engine: Remotion + KI",
      creditsInfo:
        "Planlimits und verbleibende Credits werden hier angezeigt.",
      language: "Sprache",
    },
  },
} as const;

export function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem("app-language");
  if (saved === "tr" || saved === "en" || saved === "de") {
    return saved;
  }

  const browser = window.navigator.language.toLowerCase();

  if (browser.startsWith("tr")) return "tr";
  if (browser.startsWith("de")) return "de";
  return "en";
}