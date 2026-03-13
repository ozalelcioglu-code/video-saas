"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppPageShell } from "../components/AppPageShell";
import { useLanguage } from "../provider/LanguageProvider";

type Ratio = "square" | "vertical" | "horizontal";
type Mode = "images" | "text" | "product";

type RenderStatus =
  | { status: "idle"; progress: number; phase: string }
  | { status: "rendering"; progress: number; phase: string }
  | { status: "done"; progress: number; phase: string; url?: string }
  | { status: "error"; progress: number; phase: string; error?: string };

type SceneGenerationStatus = "idle" | "generating" | "ready" | "failed";

type StoryboardScene = {
  id?: string;
  title: string;
  prompt: string;
  imagePrompt?: string;
  onScreenText?: string;
  durationSec: number;
  imageUrl?: string;
  videoUrl?: string;
  generationStatus?: SceneGenerationStatus;
  generationError?: string;
};

type StoryboardData = {
  language?: "en" | "tr" | "de";
  title: string;
  ratio?: Ratio;
  brand_tone: {
    keywords: string[];
    vibe: "premium" | "modern" | "friendly" | "bold" | "minimal";
  };
  script: {
    hook: string;
    body: string[];
    cta: string;
    captions?: string[];
  };
  scenes: StoryboardScene[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function readSSEStream(
  res: Response,
  onMessage: (payload: any) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response stream available");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const lines = evt.split("\n");
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));

      if (dataLines.length === 0) continue;

      const raw = dataLines.join("\n").trim();
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        onMessage(parsed);
      } catch {
        // ignore non-json SSE chunks
      }
    }
  }

  if (buffer.trim()) {
    const lines = buffer.split("\n");
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""));

    const raw = dataLines.join("\n").trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        onMessage(parsed);
      } catch {
        // ignore trailing non-json chunk
      }
    }
  }
}

const PAGE_TRANSLATIONS = {
  tr: {
    mode: {
      images: "Görselden Videoya",
      text: "Metinden Videoya",
      product: "URL'den Videoya",
    },
    ratio: {
      square: "Kare (1:1)",
      vertical: "Dikey (9:16)",
      horizontal: "Yatay (16:9)",
    },
    page: {
      title: "AI Video Oluştur",
      subtitle:
        "Metin, yüklenen görseller veya ürün bağlantılarından sinematik reklam videoları üretin. Mevcut motorlarınız bozulmadan deneyimi daha temiz hale getirir.",
      projectSetup: "Proje Kurulumu",
      projectSetupSub:
        "Markanızı, kaynak türünü, sahneleri ve üretim akışını tek bir çalışma alanından yönetin.",
      preview: "Önizleme",
      previewSub: "Render tamamlandığında final çıktı burada görünür.",
      quickSummary: "Hızlı Özet",
      quickSummarySub:
        "Aktif proje ve üretim durumu için hızlı genel bakış.",
      progress: "İlerleme",
      ready: "Hazır",
      done: "Tamamlandı",
      idle: "Boşta",
      error: "Hata",
      rendering: "Render alınıyor",
    },
    fields: {
      logo: "Logo",
      images: "Görseller",
      aiIdea: "AI Reklam Fikri",
      storyboardTitle: "Storyboard Başlığı",
      hook: "Giriş Cümlesi",
      cta: "Harekete Geçirici Mesaj",
      bodyLines: "Ana Metin Satırları",
      scenes: "Sahneler",
      sceneTitle: "Sahne Başlığı",
      onScreenText: "Ekran Üzeri Metin",
      duration: "Süre",
      scenePrompt: "Sahne Promptu",
      imagePrompt: "Görsel Promptu",
      productUrl: "Ürün URL",
      productTitle: "Ürün Başlığı",
      highlights: "Öne Çıkanlar",
      assets: "Varlıklar",
      brand: "Marka",
      slogan: "Slogan",
      descriptionScript: "Açıklama / Metin",
      format: "Format",
      projectBrand: "Proje Markası",
      headlineCta: "Başlık / CTA",
      sceneStatus: "Sahne Durumu",
      currentPlan: "Mevcut plan",
      remainingCredits: "Kalan kredi",
      maxDuration: "Maksimum süre",
      usedThisMonth: "Bu ay kullanım",
    },
    hints: {
      logo: "En temiz marka sonucu için kare ve şeffaf bir logo yükleyin.",
      images:
        "En fazla 6 görsel yükleyin. Temiz ve yüksek çözünürlüklü içerikler kullanın.",
      aiIdea:
        "Bu fikir storyboard üretimini, sahne promptlarını, görselleri ve final hareketli klipleri yönlendirir.",
      productUrl:
        "İleride URL taraması başlık, görseller ve öne çıkanları otomatik doldurabilir.",
      description:
        "Bunu kısa ve etkili tutun. Reklam yönünü şekillendirir.",
    },
    buttons: {
      generateStoryboard: "Storyboard Oluştur",
      generatingStoryboard: "Storyboard Oluşturuluyor...",
      generateSceneVideos: "Sahne Videolarını Üret",
      generateFinalVideo: "Final Videoyu Oluştur",
      rendering: "Render Alınıyor...",
      reset: "Sıfırla",
      removeLine: "Satırı Sil",
      addBodyLine: "Metin Satırı Ekle",
      removeScene: "Sahneyi Sil",
      addScene: "Sahne Ekle",
      downloadMp4: "MP4 İndir",
      createAnother: "Yeni Video Oluştur",
      choosePlan: "Plan Seç",
      close: "Kapat",
    },
    states: {
      noPreviewYet: "Henüz önizleme yok",
      renderingYourVideo: "Videonuz oluşturuluyor...",
      idleHelp:
        "Önce storyboard ve sahne videolarını oluşturun, ardından final videoyu render alın.",
      renderingHelp:
        "Sistem sahneleri işliyor ve final çıktıyı hazırlıyor.",
      errorHelp: "Sorunu düzeltip üretimi tekrar başlatın.",
      sceneVideosGenerated: "Sahne videoları oluşturuldu",
      preparingRequest: "İstek hazırlanıyor...",
      baseUrlNotReady: "Base URL hazır değil",
      renderComplete: "Render tamamlandı",
      renderFailed: "Render başarısız",
      logoUploadFailed: "Logo yükleme başarısız",
      imageUploadFailed: "Görsel yükleme başarısız",
      sceneVideoGenerationFailed: "Sahne video üretimi başarısız",
      generatingSceneVideos: "Sahne videoları oluşturuluyor...",
      generateSceneVideoXofY: "Sahne videosu oluşturuluyor {current}/{total}...",
      image: "Görsel",
      video: "Video",
      yes: "Evet",
      no: "Hayır",
      assets: "Varlıklar",
      mode: "Mod",
      scenes: "Sahneler",
      allSceneVideosMustBeReady:
        "Final render başlamadan önce tüm sahne videoları hazır olmalı.",
    },
    placeholders: {
      aiIdea: "Berlin'deki bir kahve dükkanı için sinematik bir reklam oluştur",
      productUrl: "https://magazaniz.com/urunler/...",
      productTitle: "Ürün adı",
      storyboardNotFound: "Storyboard sahneleri bulunamadı",
      yourBrand: "Markanız",
      yourStore: "Mağazanız",
      yourProduct: "Ürününüz",
    },
    modal: {
      title: "Plan yükseltmesi gerekiyor",
      monthlyLimit:
        "Aylık video limitinize ulaştınız. Devam etmek için daha yüksek bir plan seçin.",
      durationLimit:
        "İstenen video süresi mevcut plan limitinizi aşıyor. Devam etmek için planınızı yükseltin.",
      fallback:
        "Mevcut planınız bu işlemi kapsamıyor. Devam etmek için daha yüksek bir plan seçin.",
    },
  },
  en: {
    mode: {
      images: "Image to Video",
      text: "Text to Video",
      product: "URL to Video",
    },
    ratio: {
      square: "Square (1:1)",
      vertical: "Vertical (9:16)",
      horizontal: "Horizontal (16:9)",
    },
    page: {
      title: "Create AI Video",
      subtitle:
        "Generate cinematic ad videos from text, uploaded images, or product URLs. Your working engines stay untouched — only the experience gets cleaner.",
      projectSetup: "Project Setup",
      projectSetupSub:
        "Configure your brand, source mode, scenes, and generation flow from a single workspace.",
      preview: "Preview",
      previewSub: "Final output appears here when rendering is complete.",
      quickSummary: "Quick Summary",
      quickSummarySub:
        "A fast overview of the active project and generation state.",
      progress: "Progress",
      ready: "Ready",
      done: "Done",
      idle: "Idle",
      error: "Error",
      rendering: "Rendering",
    },
    fields: {
      logo: "Logo",
      images: "Images",
      aiIdea: "AI Ad Idea",
      storyboardTitle: "Storyboard Title",
      hook: "Hook",
      cta: "CTA",
      bodyLines: "Body Lines",
      scenes: "Scenes",
      sceneTitle: "Scene Title",
      onScreenText: "On-screen text",
      duration: "Duration",
      scenePrompt: "Scene Prompt",
      imagePrompt: "Image Prompt",
      productUrl: "Product URL",
      productTitle: "Product Title",
      highlights: "Highlights",
      assets: "Assets",
      brand: "Brand",
      slogan: "Slogan",
      descriptionScript: "Description / Script",
      format: "Format",
      projectBrand: "Project Brand",
      headlineCta: "Headline / CTA",
      sceneStatus: "Scene Status",
      currentPlan: "Current plan",
      remainingCredits: "Remaining credits",
      maxDuration: "Max duration",
      usedThisMonth: "Used this month",
    },
    hints: {
      logo: "Upload a square transparent logo for the cleanest brand result.",
      images: "Upload up to 6 images. Use clean, high-resolution assets.",
      aiIdea:
        "This idea powers storyboard generation, scene prompts, images, and final motion clips.",
      productUrl:
        "URL scraping can later automate title, images, and highlights.",
      description:
        "Keep this short and punchy. It shapes the ad direction.",
    },
    buttons: {
      generateStoryboard: "Generate Storyboard",
      generatingStoryboard: "Generating Storyboard...",
      generateSceneVideos: "Generate Scene Videos",
      generateFinalVideo: "Generate Final Video",
      rendering: "Rendering...",
      reset: "Reset",
      removeLine: "Remove line",
      addBodyLine: "Add Body Line",
      removeScene: "Remove scene",
      addScene: "Add Scene",
      downloadMp4: "Download MP4",
      createAnother: "Create another",
      choosePlan: "Choose a plan",
      close: "Close",
    },
    states: {
      noPreviewYet: "No preview yet",
      renderingYourVideo: "Rendering your video...",
      idleHelp:
        "Generate storyboard, scene videos, then render the final video.",
      renderingHelp:
        "The system is processing scenes and preparing the final output.",
      errorHelp: "Fix the issue and run the generation again.",
      sceneVideosGenerated: "Scene videos generated",
      preparingRequest: "Preparing request...",
      baseUrlNotReady: "Base URL not ready",
      renderComplete: "Render complete",
      renderFailed: "Render failed",
      logoUploadFailed: "Logo upload failed",
      imageUploadFailed: "Image upload failed",
      sceneVideoGenerationFailed: "Scene video generation failed",
      generatingSceneVideos: "Generating scene videos...",
      generateSceneVideoXofY: "Generating scene video {current}/{total}...",
      image: "Image",
      video: "Video",
      yes: "Yes",
      no: "No",
      assets: "Assets",
      mode: "Mode",
      scenes: "Scenes",
      allSceneVideosMustBeReady:
        "All scene videos must be ready before final rendering.",
    },
    placeholders: {
      aiIdea: "Create a cinematic ad for a coffee shop in Berlin",
      productUrl: "https://yourstore.com/products/...",
      productTitle: "Product name",
      storyboardNotFound: "Storyboard scenes not found",
      yourBrand: "Your Brand",
      yourStore: "Your Store",
      yourProduct: "Your Product",
    },
    modal: {
      title: "Plan upgrade required",
      monthlyLimit:
        "You’ve reached your monthly video limit. Please choose a higher plan to continue.",
      durationLimit:
        "Your requested video duration exceeds your current plan limit. Please upgrade to continue.",
      fallback:
        "Your current plan does not cover this action. Please choose a higher plan to continue.",
    },
  },
  de: {
    mode: {
      images: "Bild zu Video",
      text: "Text zu Video",
      product: "URL zu Video",
    },
    ratio: {
      square: "Quadrat (1:1)",
      vertical: "Vertikal (9:16)",
      horizontal: "Horizontal (16:9)",
    },
    page: {
      title: "KI-Video erstellen",
      subtitle:
        "Erstellen Sie kinoreife Werbevideos aus Text, hochgeladenen Bildern oder Produkt-URLs. Ihre bestehende Engine bleibt unverändert — nur die Nutzung wird sauberer.",
      projectSetup: "Projekteinrichtung",
      projectSetupSub:
        "Konfigurieren Sie Marke, Quelltyp, Szenen und Produktionsablauf in einem einzigen Arbeitsbereich.",
      preview: "Vorschau",
      previewSub:
        "Die finale Ausgabe erscheint hier, sobald das Rendering abgeschlossen ist.",
      quickSummary: "Kurzübersicht",
      quickSummarySub:
        "Ein schneller Überblick über das aktive Projekt und den Produktionsstatus.",
      progress: "Fortschritt",
      ready: "Bereit",
      done: "Fertig",
      idle: "Leerlauf",
      error: "Fehler",
      rendering: "Rendering",
    },
    fields: {
      logo: "Logo",
      images: "Bilder",
      aiIdea: "KI-Werbeidee",
      storyboardTitle: "Storyboard-Titel",
      hook: "Hook",
      cta: "CTA",
      bodyLines: "Textzeilen",
      scenes: "Szenen",
      sceneTitle: "Szenentitel",
      onScreenText: "Text im Bild",
      duration: "Dauer",
      scenePrompt: "Szenen-Prompt",
      imagePrompt: "Bild-Prompt",
      productUrl: "Produkt-URL",
      productTitle: "Produkttitel",
      highlights: "Highlights",
      assets: "Assets",
      brand: "Marke",
      slogan: "Slogan",
      descriptionScript: "Beschreibung / Skript",
      format: "Format",
      projectBrand: "Projektmarke",
      headlineCta: "Headline / CTA",
      sceneStatus: "Szenenstatus",
      currentPlan: "Aktueller Plan",
      remainingCredits: "Verbleibende Credits",
      maxDuration: "Maximale Dauer",
      usedThisMonth: "Diesen Monat genutzt",
    },
    hints: {
      logo: "Laden Sie ein quadratisches transparentes Logo für das sauberste Markenergebnis hoch.",
      images:
        "Laden Sie bis zu 6 Bilder hoch. Verwenden Sie saubere, hochauflösende Inhalte.",
      aiIdea:
        "Diese Idee steuert die Storyboard-Erstellung, Szenen-Prompts, Bilder und die finalen Motion-Clips.",
      productUrl:
        "Die URL-Auswertung kann später Titel, Bilder und Highlights automatisch füllen.",
      description:
        "Halten Sie es kurz und prägnant. Es bestimmt die Richtung der Anzeige.",
    },
    buttons: {
      generateStoryboard: "Storyboard erstellen",
      generatingStoryboard: "Storyboard wird erstellt...",
      generateSceneVideos: "Szenenvideos erzeugen",
      generateFinalVideo: "Finales Video erzeugen",
      rendering: "Rendering...",
      reset: "Zurücksetzen",
      removeLine: "Zeile entfernen",
      addBodyLine: "Textzeile hinzufügen",
      removeScene: "Szene entfernen",
      addScene: "Szene hinzufügen",
      downloadMp4: "MP4 herunterladen",
      createAnother: "Weiteres erstellen",
      choosePlan: "Plan wählen",
      close: "Schließen",
    },
    states: {
      noPreviewYet: "Noch keine Vorschau",
      renderingYourVideo: "Ihr Video wird gerendert...",
      idleHelp:
        "Erstellen Sie zuerst Storyboard und Szenenvideos und rendern Sie dann das finale Video.",
      renderingHelp:
        "Das System verarbeitet die Szenen und bereitet die finale Ausgabe vor.",
      errorHelp:
        "Beheben Sie das Problem und starten Sie die Erstellung erneut.",
      sceneVideosGenerated: "Szenenvideos wurden erstellt",
      preparingRequest: "Anfrage wird vorbereitet...",
      baseUrlNotReady: "Base-URL ist nicht bereit",
      renderComplete: "Rendering abgeschlossen",
      renderFailed: "Rendering fehlgeschlagen",
      logoUploadFailed: "Logo-Upload fehlgeschlagen",
      imageUploadFailed: "Bild-Upload fehlgeschlagen",
      sceneVideoGenerationFailed: "Szenenvideo-Erstellung fehlgeschlagen",
      generatingSceneVideos: "Szenenvideos werden erstellt...",
      generateSceneVideoXofY: "Szenenvideo wird erstellt {current}/{total}...",
      image: "Bild",
      video: "Video",
      yes: "Ja",
      no: "Nein",
      assets: "Assets",
      mode: "Modus",
      scenes: "Szenen",
      allSceneVideosMustBeReady:
        "Vor dem finalen Rendering müssen alle Szenenvideos bereit sein.",
    },
    placeholders: {
      aiIdea: "Erstelle eine kinoreife Werbung für ein Café in Berlin",
      productUrl: "https://ihrshop.com/produkte/...",
      productTitle: "Produktname",
      storyboardNotFound: "Storyboard-Szenen nicht gefunden",
      yourBrand: "Ihre Marke",
      yourStore: "Ihr Shop",
      yourProduct: "Ihr Produkt",
    },
    modal: {
      title: "Plan-Upgrade erforderlich",
      monthlyLimit:
        "Sie haben Ihr monatliches Videolimit erreicht. Bitte wählen Sie einen höheren Plan, um fortzufahren.",
      durationLimit:
        "Die angeforderte Videodauer überschreitet das Limit Ihres aktuellen Plans. Bitte upgraden Sie, um fortzufahren.",
      fallback:
        "Ihr aktueller Plan deckt diese Aktion nicht ab. Bitte wählen Sie einen höheren Plan, um fortzufahren.",
    },
  },
} as const;

function formatTemplate(
  template: string,
  vars: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export default function Page() {
  const { language } = useLanguage();

  const [mode, setMode] = useState<Mode>("text");

  const [brand, setBrand] = useState("Duble-S Technology");
  const [slogan, setSlogan] = useState(
    "Digital Solutions for Modern Businesses"
  );
  const [text, setText] = useState(
    "We build modern websites and custom software. Fast, secure, scalable."
  );

  const [durationSec, setDurationSec] = useState(24);
  const [ratio, setRatio] = useState<Ratio>("square");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const prompt =
    "Create a cinematic 20–30s marketing video for a web development & software company. Emphasize speed, quality, and trust.";

  const [productUrl, setProductUrl] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productHighlights, setProductHighlights] = useState(
    "Key benefit 1.\nKey benefit 2.\nKey benefit 3."
  );

  const [idea, setIdea] = useState(
    "Create a cinematic ad for a coffee shop in Berlin"
  );
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardError, setStoryboardError] = useState("");

  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState<RenderStatus>({
    status: "idle",
    progress: 0,
    phase: "",
  });

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [upgradeDetails, setUpgradeDetails] = useState<{
    code?: string;
    planLabel?: string;
    remainingCredits?: number;
    maxDurationSec?: number;
    monthlyVideoLimit?: number | null;
    usedThisMonth?: number;
  } | null>(null);

  const sceneVideoCacheRef = useRef<Map<string, string>>(new Map());
  const [sceneGenerationLocked, setSceneGenerationLocked] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const t = PAGE_TRANSLATIONS[language];

  const MODE_LABEL: Record<Mode, string> = {
    images: t.mode.images,
    text: t.mode.text,
    product: t.mode.product,
  };

  const RATIO_LABEL: Record<Ratio, string> = {
    square: t.ratio.square,
    vertical: t.ratio.vertical,
    horizontal: t.ratio.horizontal,
  };

  const computed = useMemo(() => {
    if (mode === "text") {
      const derivedBrand = brand || t.placeholders.yourBrand;
      const derivedSlogan =
        storyboard?.script?.cta ||
        slogan ||
        "Modern websites • Custom software • Fast delivery";

      const derivedText =
        storyboard?.script?.body?.length
          ? storyboard.script.body.join(" ")
          : prompt.trim().length > 0
            ? [
                "High-converting websites and custom software.",
                "Clean UI, fast performance, secure delivery.",
                "From idea to launch—quick, reliable, scalable.",
                "Book a free consultation today.",
              ].join(" ")
            : text;

      return {
        brand: derivedBrand,
        slogan: derivedSlogan,
        text: derivedText,
      };
    }

    if (mode === "product") {
      const title = productTitle.trim() || t.placeholders.yourProduct;
      const url = productUrl.trim();
      const highlights = productHighlights
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);

      const derivedBrand = brand || t.placeholders.yourStore;
      const derivedSlogan =
        slogan || "Shop now • Fast shipping • Secure checkout";

      const derivedText = [
        `${title}.`,
        highlights.length ? `Highlights: ${highlights.join(" • ")}.` : "",
        url ? `Get it here: ${url}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        brand: derivedBrand,
        slogan: derivedSlogan,
        text: derivedText || text,
      };
    }

    return { brand, slogan, text };
  }, [
    mode,
    prompt,
    productTitle,
    productHighlights,
    productUrl,
    brand,
    slogan,
    text,
    storyboard,
    t.placeholders.yourBrand,
    t.placeholders.yourStore,
    t.placeholders.yourProduct,
  ]);

  const payload = useMemo(
    () => ({
      baseUrl,
      brand: computed.brand,
      slogan: computed.slogan,
      text: computed.text,
      durationSec,
      ratio,
      assets: { logoUrl, images: imageUrls },
    }),
    [
      baseUrl,
      computed.brand,
      computed.slogan,
      computed.text,
      durationSec,
      ratio,
      logoUrl,
      imageUrls,
    ]
  );

  function getSceneCacheKey(scene: StoryboardScene) {
    return [
      scene.imageUrl ?? "",
      scene.prompt ?? "",
      scene.durationSec ?? 0,
      ratio,
      mode,
    ].join("::");
  }

  function updateSingleScene(index: number, patch: Partial<StoryboardScene>) {
    setStoryboard((prev) => {
      if (!prev) return prev;

      const scenes = [...prev.scenes];
      scenes[index] = {
        ...scenes[index],
        ...patch,
      };

      return {
        ...prev,
        scenes,
      };
    });
  }

  

  async function uploadFiles(files: FileList) {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error ?? "Upload failed (/api/upload not ready yet)");
    }

    return data.urls as string[];
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const urls = await uploadFiles(files);
      setLogoUrl(urls[0] ?? null);
    } catch (err: any) {
      setStatus({
        status: "error",
        progress: 0,
        phase: t.states.logoUploadFailed,
        error: err?.message ?? t.states.logoUploadFailed,
      });
    }
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const urls = await uploadFiles(files);
      setImageUrls((prev) => [...prev, ...urls].slice(0, 6));
    } catch (err: any) {
      setStatus({
        status: "error",
        progress: 0,
        phase: t.states.imageUploadFailed,
        error: err?.message ?? t.states.imageUploadFailed,
      });
    }
  }

  async function generateStoryboard() {
    try {
      setStoryboardLoading(true);
      setStoryboardError("");
      setStoryboard(null);

      const finalIdea =
        idea.trim() ||
        prompt.trim() ||
        "Create a cinematic ad for a digital agency with modern, premium, realistic scenes.";

      const res = await fetch("/api/ai/storyboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idea: finalIdea,
          brand,
          ratio,
          durationSec,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Storyboard generation failed");
      }

      if (!data?.storyboard) {
        throw new Error("No storyboard returned");
      }

      setStoryboard({
        ...data.storyboard,
        scenes: (data.storyboard.scenes || []).map(
          (scene: StoryboardScene) => ({
            ...scene,
            generationStatus: scene.videoUrl ? "ready" : "idle",
            generationError: "",
          })
        ),
      });
    } catch (err: any) {
      setStoryboardError(err?.message ?? "Storyboard generation failed");
    } finally {
      setStoryboardLoading(false);
    }
  }

  function updateStoryboardTitle(value: string) {
    setStoryboard((prev) => (prev ? { ...prev, title: value } : prev));
  }

  function updateStoryboardHook(value: string) {
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            script: {
              ...prev.script,
              hook: value,
            },
          }
        : prev
    );
  }

  function updateStoryboardCta(value: string) {
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            script: {
              ...prev.script,
              cta: value,
            },
          }
        : prev
    );
  }

  function updateStoryboardBody(index: number, value: string) {
    setStoryboard((prev) => {
      if (!prev) return prev;
      const body = [...prev.script.body];
      body[index] = value;
      return {
        ...prev,
        script: {
          ...prev.script,
          body,
        },
      };
    });
  }

  function addStoryboardBodyLine() {
    setStoryboard((prev) =>
      prev
        ? {
            ...prev,
            script: {
              ...prev.script,
              body: [...prev.script.body, ""],
            },
          }
        : prev
    );
  }

  function removeStoryboardBodyLine(index: number) {
    setStoryboard((prev) => {
      if (!prev) return prev;
      if (prev.script.body.length <= 1) return prev;

      return {
        ...prev,
        script: {
          ...prev.script,
          body: prev.script.body.filter((_, i) => i !== index),
        },
      };
    });
  }

  function updateStoryboardScene(
    index: number,
    field: keyof StoryboardScene,
    value: string | number
  ) {
    setStoryboard((prev) => {
      if (!prev) return prev;

      const scenes = [...prev.scenes];
      const scene = { ...scenes[index] };

      if (field === "durationSec") {
        scene.durationSec = clamp(Number(value) || 2, 2, 10);
      } else if (field === "title") {
        scene.title = String(value);
      } else if (field === "prompt") {
        scene.prompt = String(value);
      } else if (field === "onScreenText") {
        scene.onScreenText = String(value);
      } else if (field === "imagePrompt") {
        scene.imagePrompt = String(value);
      }

      scenes[index] = scene;

      return {
        ...prev,
        scenes,
      };
    });
  }

  function addStoryboardScene() {
    setStoryboard((prev) => {
      if (!prev) return prev;
      if (prev.scenes.length >= 7) return prev;

      return {
        ...prev,
        scenes: [
          ...prev.scenes,
          {
            title: `Scene ${prev.scenes.length + 1}`,
            prompt:
              "cinematic realistic commercial shot, soft lighting, subtle camera movement, shallow depth of field",
            imagePrompt:
              "cinematic realistic commercial still frame, soft lighting, premium composition, shallow depth of field",
            onScreenText: "New Scene",
            durationSec: 4,
            generationStatus: "idle",
            generationError: "",
          },
        ],
      };
    });
  }

  function removeStoryboardScene(index: number) {
    setStoryboard((prev) => {
      if (!prev) return prev;
      if (prev.scenes.length <= 1) return prev;

      return {
        ...prev,
        scenes: prev.scenes.filter((_, i) => i !== index),
      };
    });
  }

  function resetAll() {
    setStatus({
      status: "idle",
      progress: 0,
      phase: "",
    });
    setLogoUrl(null);
    setImageUrls([]);
    setStoryboard(null);
    setStoryboardError("");
    setIdea("");
    setUpgradeModalOpen(false);
    setUpgradeMessage("");
    setUpgradeDetails(null);
    sceneVideoCacheRef.current.clear();
  }

  async function generateSceneVideos() {
    if (!storyboard?.scenes?.length) {
      alert(t.placeholders.storyboardNotFound);
      return;
    }

    if (sceneGenerationLocked) {
      return;
    }

    try {
      setSceneGenerationLocked(true);

      setStatus({
        status: "rendering",
        progress: 10,
        phase: t.states.generatingSceneVideos,
      });

      const total = storyboard.scenes.length;
      let generatedCount = 0;
      let anyFailure = false;

      for (let index = 0; index < total; index++) {
        const currentScene = storyboard.scenes[index];

        if (!currentScene.imageUrl) {
          updateSingleScene(index, {
            generationStatus: currentScene.videoUrl ? "ready" : "idle",
            generationError: "",
          });
          continue;
        }

        if (currentScene.videoUrl) {
          updateSingleScene(index, {
            generationStatus: "ready",
            generationError: "",
          });
          continue;
        }

        const cacheKey = getSceneCacheKey(currentScene);
        const cachedVideoUrl = sceneVideoCacheRef.current.get(cacheKey);

        if (cachedVideoUrl) {
          updateSingleScene(index, {
            videoUrl: cachedVideoUrl,
            generationStatus: "ready",
            generationError: "",
          });
          generatedCount += 1;
          continue;
        }

        updateSingleScene(index, {
          generationStatus: "generating",
          generationError: "",
        });

        setStatus({
          status: "rendering",
          progress: clamp(10 + Math.round((index / total) * 80), 10, 90),
          phase: formatTemplate(t.states.generateSceneVideoXofY, {
            current: index + 1,
            total,
          }),
        });

        try {
          const res = await fetch("/api/ai/video", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: currentScene.imageUrl,
              prompt: currentScene.prompt,
              durationSec: currentScene.durationSec,
              cacheKey,
            }),
          });

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            throw new Error(
              data?.error || t.states.sceneVideoGenerationFailed
            );
          }

          if (!data?.ok || !data?.videoUrl) {
            throw new Error(
              data?.error || t.states.sceneVideoGenerationFailed
            );
          }

          sceneVideoCacheRef.current.set(cacheKey, data.videoUrl);

          updateSingleScene(index, {
            videoUrl: data.videoUrl,
            generationStatus: "ready",
            generationError: "",
          });

          generatedCount += 1;
        } catch (error: any) {
          console.error("Scene video generation failed:", error);
          anyFailure = true;

          updateSingleScene(index, {
            generationStatus: "failed",
            generationError:
              error?.message || t.states.sceneVideoGenerationFailed,
          });
        }
      }

      setStatus({
        status: anyFailure ? "error" : "idle",
        progress: 0,
        phase: anyFailure
          ? t.states.sceneVideoGenerationFailed
          : t.states.sceneVideosGenerated,
        ...(anyFailure
          ? { error: t.states.sceneVideoGenerationFailed }
          : {}),
      });
    } catch (error) {
      console.error(error);

      setStatus({
        status: "error",
        progress: 0,
        phase: t.states.sceneVideoGenerationFailed,
        error: t.states.sceneVideoGenerationFailed,
      });
    } finally {
      setSceneGenerationLocked(false);
    }
  }

  async function startRender() {
    if (!baseUrl) {
      setStatus({
        status: "error",
        progress: 0,
        phase: t.states.baseUrlNotReady,
        error: `${t.states.baseUrlNotReady}. Refresh once.`,
      });
      return;
    }

    if (mode === "text" && storyboard?.scenes?.length) {
      const scenesWithImages = storyboard.scenes.filter(
        (scene) => !!scene.imageUrl
      );
      const missingSceneVideos = scenesWithImages.some(
        (scene) => !scene.videoUrl
      );

      if (missingSceneVideos) {
        setStatus({
          status: "error",
          progress: 0,
          phase: t.states.sceneVideoGenerationFailed,
          error: t.states.allSceneVideosMustBeReady,
        });
        return;
      }
    }

    setStatus({
      status: "rendering",
      progress: 5,
      phase: t.states.preparingRequest,
    });

    const finalPayload =
      mode === "text" && storyboard
        ? {
            ...payload,
            text: storyboard?.script?.body?.join(" ") ?? "",
            slogan: storyboard?.script?.cta ?? payload.slogan,
            storyboard,
          }
        : payload;

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok && !contentType.includes("text/event-stream")) {
        const data = await res.json().catch(() => null);

        if (res.status === 403 && data?.upgradeRequired) {
          setUpgradeMessage(
            data?.code === "PLAN_MONTHLY_LIMIT"
              ? t.modal.monthlyLimit
              : t.modal.durationLimit
          );

          setUpgradeDetails({
            code: data?.code,
            planLabel: data?.planLabel,
            remainingCredits: data?.remainingCredits,
            maxDurationSec: data?.maxDurationSec,
            monthlyVideoLimit: data?.monthlyVideoLimit,
            usedThisMonth: data?.usedThisMonth,
          });

          setUpgradeModalOpen(true);

          setStatus({
            status: "idle",
            progress: 0,
            phase: "",
          });

          return;
        }

        throw new Error(data?.error ?? t.states.renderFailed);
      }

      if (contentType.includes("text/event-stream")) {
        let finalUrl = "";
        let finalError = "";

        await readSSEStream(res, (msg) => {
          if (msg?.type === "phase") {
            setStatus({
              status: "rendering",
              progress:
                typeof msg.progress === "number"
                  ? clamp(msg.progress, 0, 100)
                  : 40,
              phase: msg.phase || t.page.rendering,
            });
          }

          if (msg?.type === "done" && msg?.url) {
            finalUrl = msg.url;
          }

          if (msg?.type === "error") {
            finalError = msg.error || t.states.renderFailed;
          }
        });

        if (finalError) {
          throw new Error(finalError);
        }

        if (!finalUrl) {
          throw new Error("Render finished but no video URL returned");
        }

        setStatus({
          status: "done",
          progress: 100,
          phase: t.states.renderComplete,
          url: finalUrl,
        });
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? t.states.renderFailed);
      }

      if (!data?.url) {
        throw new Error("Render finished but no video URL returned");
      }

      setStatus({
        status: "done",
        progress: 100,
        phase: t.states.renderComplete,
        url: data.url,
      });
    } catch (err: any) {
      setStatus({
        status: "error",
        progress: 0,
        phase: t.states.renderFailed,
        error: err?.message ?? t.states.renderFailed,
      });
    }
  }

  const canRender = durationSec >= 10 && durationSec <= 60;

  const progressPercent =
    status.status === "rendering"
      ? clamp(status.progress ?? 55, 0, 100)
      : status.status === "done"
        ? 100
        : 0;

  const styles = {
    topBadges: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    } as React.CSSProperties,

    badge: {
      padding: "7px 11px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#d7e4f7",
      whiteSpace: "nowrap",
    } as React.CSSProperties,

    modeTabs: {
      display: "flex",
      gap: 10,
      marginBottom: 18,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,

    modeTab: (active: boolean) =>
      ({
        padding: "12px 16px",
        borderRadius: 14,
        border: active
          ? "1px solid rgba(59,130,246,0.36)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active
          ? "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(139,92,246,0.16))"
          : "rgba(255,255,255,0.03)",
        color: active ? "#f6f9ff" : "rgba(231,238,249,0.78)",
        cursor: "pointer",
        fontWeight: 800,
        minWidth: 148,
      }) as React.CSSProperties,

    contentGrid: {
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      gap: 18,
      alignItems: "start",
    } as React.CSSProperties,

    card: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
      overflow: "hidden",
      backdropFilter: "blur(12px)",
    } as React.CSSProperties,

    cardHeader: {
      padding: "18px 18px 0",
    } as React.CSSProperties,

    cardTitle: {
      fontSize: 18,
      fontWeight: 900,
      margin: 0,
    } as React.CSSProperties,

    cardSub: {
      fontSize: 13,
      color: "rgba(231,238,249,0.62)",
      marginTop: 6,
      lineHeight: 1.45,
    } as React.CSSProperties,

    cardBody: {
      padding: 18,
    } as React.CSSProperties,

    field: {
      display: "grid",
      gap: 7,
      marginBottom: 14,
    } as React.CSSProperties,

    label: {
      fontSize: 12,
      color: "rgba(231,238,249,0.74)",
      fontWeight: 800,
      letterSpacing: 0.15,
      textTransform: "uppercase",
    } as React.CSSProperties,

    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(4,10,20,0.65)",
      color: "#e7eef9",
      outline: "none",
    } as React.CSSProperties,

    textarea: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(4,10,20,0.65)",
      color: "#e7eef9",
      outline: "none",
      resize: "vertical" as const,
      minHeight: 110,
    } as React.CSSProperties,

    row: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    } as React.CSSProperties,

    hint: {
      fontSize: 12,
      color: "rgba(231,238,249,0.58)",
      lineHeight: 1.4,
      marginTop: 5,
    } as React.CSSProperties,

    divider: {
      height: 1,
      background: "rgba(255,255,255,0.08)",
      margin: "14px 0",
    } as React.CSSProperties,

    actions: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap" as const,
      alignItems: "center",
      marginTop: 8,
    } as React.CSSProperties,

    primaryBtn: (disabled: boolean) =>
      ({
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(59,130,246,0.35)",
        background: disabled
          ? "rgba(255,255,255,0.07)"
          : "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))",
        color: disabled ? "rgba(231,238,249,0.5)" : "#ffffff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        minWidth: 178,
        boxShadow: disabled ? "none" : "0 10px 24px rgba(59,130,246,0.2)",
      }) as React.CSSProperties,

    secondaryBtn: {
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      color: "#dce8f8",
      cursor: "pointer",
      fontWeight: 800,
    } as React.CSSProperties,

    dangerBtn: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,120,120,0.3)",
      background: "rgba(255,120,120,0.1)",
      color: "#ffd0d0",
      cursor: "pointer",
      fontWeight: 800,
    } as React.CSSProperties,

    progressWrap: {
      width: "100%",
      height: 12,
      borderRadius: 999,
      background: "rgba(255,255,255,0.06)",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,

    progressBar: (pct: number) =>
      ({
        height: "100%",
        width: `${clamp(pct, 0, 100)}%`,
        background:
          "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(139,92,246,0.95))",
      }) as React.CSSProperties,

    thumbGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 10,
      marginTop: 10,
    } as React.CSSProperties,

    thumb: {
      width: "100%",
      aspectRatio: "1 / 1",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,

    small: {
      fontSize: 12,
      color: "rgba(231,238,249,0.64)",
    } as React.CSSProperties,

    video: {
      width: "100%",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(0,0,0,0.35)",
    } as React.CSSProperties,

    linkBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(59,130,246,0.24)",
      background: "rgba(59,130,246,0.12)",
      color: "#d7ebff",
      textDecoration: "none",
      fontWeight: 900,
      cursor: "pointer",
    } as React.CSSProperties,

    mono: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 12,
      color: "rgba(231,238,249,0.74)",
      background: "rgba(0,0,0,0.18)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 12,
      overflowX: "auto" as const,
      marginTop: 14,
    } as React.CSSProperties,

    storyboardCard: {
      padding: 12,
      borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      marginTop: 10,
    } as React.CSSProperties,

    statsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14,
    } as React.CSSProperties,

    statCard: {
      padding: 14,
      borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,

    statValue: {
      fontSize: 22,
      fontWeight: 950,
      marginTop: 4,
    } as React.CSSProperties,

    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(2,6,14,0.72)",
      backdropFilter: "blur(8px)",
      display: "grid",
      placeItems: "center",
      zIndex: 1000,
      padding: 20,
    } as React.CSSProperties,

    modal: {
      width: "100%",
      maxWidth: 560,
      borderRadius: 24,
      background:
        "linear-gradient(180deg, rgba(11,18,34,0.98), rgba(8,14,27,0.98))",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
      padding: 24,
    } as React.CSSProperties,

    modalTitle: {
      margin: 0,
      fontSize: 24,
      fontWeight: 950,
      letterSpacing: -0.4,
    } as React.CSSProperties,

    modalText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 1.6,
      color: "rgba(231,238,249,0.72)",
    } as React.CSSProperties,

    modalInfo: {
      marginTop: 16,
      padding: 14,
      borderRadius: 16,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      fontSize: 13,
      color: "#d7e4f7",
      lineHeight: 1.7,
    } as React.CSSProperties,
  };

  return (
    <>
      <AppPageShell
        title={t.page.title}
        subtitle={t.page.subtitle}
        rightSlot={
          <div style={styles.topBadges}>
            <div style={styles.badge}>{MODE_LABEL[mode]}</div>
            <div style={styles.badge}>{RATIO_LABEL[ratio]}</div>
            <div style={styles.badge}>
              {status.status === "rendering"
                ? status.phase || t.page.rendering
                : status.status === "done"
                  ? t.page.ready
                  : status.status === "error"
                    ? t.page.error
                    : t.page.idle}
            </div>
          </div>
        }
      >
        <div style={styles.modeTabs}>
          {(["text", "images", "product"] as Mode[]).map((m) => (
            <button
              key={m}
              style={styles.modeTab(mode === m)}
              onClick={() => setMode(m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div style={styles.contentGrid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>{t.page.projectSetup}</h3>
              <div style={styles.cardSub}>{t.page.projectSetupSub}</div>
            </div>

            <div style={styles.cardBody}>
              {mode === "images" && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.logo}</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickLogo}
                      style={styles.input}
                    />
                    <div style={styles.hint}>{t.hints.logo}</div>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.images}</div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickImages}
                      style={styles.input}
                    />
                    <div style={styles.hint}>{t.hints.images}</div>

                    {imageUrls.length > 0 && (
                      <div style={styles.thumbGrid}>
                        {imageUrls.slice(0, 3).map((u) => (
                          <div key={u} style={styles.thumb}>
                            <img
                              src={u}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {mode === "text" && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.aiIdea}</div>
                    <textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      style={{ ...styles.textarea, minHeight: 130 }}
                      placeholder={t.placeholders.aiIdea}
                    />
                    <div style={styles.hint}>{t.hints.aiIdea}</div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      onClick={generateStoryboard}
                      disabled={storyboardLoading || !idea.trim()}
                      style={styles.primaryBtn(
                        storyboardLoading || !idea.trim()
                      )}
                    >
                      {storyboardLoading
                        ? t.buttons.generatingStoryboard
                        : t.buttons.generateStoryboard}
                    </button>

                    <button
                      onClick={generateSceneVideos}
                      disabled={
                        storyboardLoading ||
                        !storyboard?.scenes?.length ||
                        status.status === "rendering" ||
                        sceneGenerationLocked
                      }
                      style={styles.secondaryBtn}
                    >
                      {t.buttons.generateSceneVideos}
                    </button>
                  </div>

                  {storyboardError && (
                    <div
                      style={{ marginTop: 10, color: "#ffb4b4", fontWeight: 800 }}
                    >
                      {storyboardError}
                    </div>
                  )}

                  {storyboard && (
                    <div style={styles.storyboardCard}>
                      <div style={styles.field}>
                        <div style={styles.label}>{t.fields.storyboardTitle}</div>
                        <input
                          value={storyboard.title}
                          onChange={(e) => updateStoryboardTitle(e.target.value)}
                          style={styles.input}
                        />
                      </div>

                      <div style={{ ...styles.small, marginBottom: 12 }}>
                        Vibe: <b>{storyboard?.brand_tone?.vibe ?? "-"}</b> —
                        Keywords:{" "}
                        {storyboard?.brand_tone?.keywords?.join(", ") ?? "-"}
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>{t.fields.hook}</div>
                        <textarea
                          value={storyboard?.script?.hook ?? ""}
                          onChange={(e) => updateStoryboardHook(e.target.value)}
                          style={{ ...styles.textarea, minHeight: 80 }}
                        />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>{t.fields.cta}</div>
                        <input
                          value={storyboard?.script?.cta ?? ""}
                          onChange={(e) => updateStoryboardCta(e.target.value)}
                          style={styles.input}
                        />
                      </div>

                      <div style={{ fontWeight: 900, marginBottom: 8 }}>
                        {t.fields.bodyLines}
                      </div>

                      {storyboard?.script?.body?.map((line, index) => (
                        <div key={index} style={{ ...styles.row, marginBottom: 8 }}>
                          <input
                            value={line}
                            onChange={(e) =>
                              updateStoryboardBody(index, e.target.value)
                            }
                            style={styles.input}
                          />
                          <button
                            style={styles.dangerBtn}
                            onClick={() => removeStoryboardBodyLine(index)}
                          >
                            {t.buttons.removeLine}
                          </button>
                        </div>
                      ))}

                      <div style={styles.actions}>
                        <button
                          style={styles.secondaryBtn}
                          onClick={addStoryboardBodyLine}
                        >
                          {t.buttons.addBodyLine}
                        </button>
                      </div>

                      <div style={styles.divider} />

                      <div style={{ fontWeight: 900, marginBottom: 8 }}>
                        {t.fields.scenes}
                      </div>

                      {storyboard.scenes.map((scene, index) => (
                        <div
                          key={scene.id ?? index}
                          style={{ ...styles.storyboardCard, marginTop: 10 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>
                              {t.fields.scenes} {index + 1}
                            </div>
                            <button
                              style={styles.dangerBtn}
                              onClick={() => removeStoryboardScene(index)}
                            >
                              {t.buttons.removeScene}
                            </button>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>{t.fields.sceneTitle}</div>
                            <input
                              value={scene.title}
                              onChange={(e) =>
                                updateStoryboardScene(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.row}>
                            <div style={styles.field}>
                              <div style={styles.label}>
                                {t.fields.onScreenText}
                              </div>
                              <input
                                value={scene.onScreenText ?? ""}
                                onChange={(e) =>
                                  updateStoryboardScene(
                                    index,
                                    "onScreenText",
                                    e.target.value
                                  )
                                }
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <div style={styles.label}>{t.fields.duration}</div>
                              <input
                                type="number"
                                min={2}
                                max={10}
                                value={scene.durationSec}
                                onChange={(e) =>
                                  updateStoryboardScene(
                                    index,
                                    "durationSec",
                                    Number(e.target.value)
                                  )
                                }
                                style={styles.input}
                              />
                            </div>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>{t.fields.scenePrompt}</div>
                            <textarea
                              value={scene.prompt}
                              onChange={(e) =>
                                updateStoryboardScene(
                                  index,
                                  "prompt",
                                  e.target.value
                                )
                              }
                              style={{ ...styles.textarea, minHeight: 110 }}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>{t.fields.imagePrompt}</div>
                            <textarea
                              value={scene.imagePrompt ?? ""}
                              onChange={(e) =>
                                updateStoryboardScene(
                                  index,
                                  "imagePrompt",
                                  e.target.value
                                )
                              }
                              style={{ ...styles.textarea, minHeight: 90 }}
                            />
                          </div>

                          <div style={styles.small}>
                            {t.states.image}:{" "}
                            {scene.imageUrl ? t.states.yes : t.states.no} —{" "}
                            {t.states.video}:{" "}
                            {scene.videoUrl ? t.states.yes : t.states.no} — Status:{" "}
                            {scene.generationStatus ?? "idle"}
                            {scene.generationError
                              ? ` — ${scene.generationError}`
                              : ""}
                          </div>
                        </div>
                      ))}

                      <div style={styles.actions}>
                        <button
                          style={styles.secondaryBtn}
                          onClick={addStoryboardScene}
                          disabled={storyboard.scenes.length >= 7}
                        >
                          {t.buttons.addScene}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === "product" && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.productUrl}</div>
                    <input
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      style={styles.input}
                      placeholder={t.placeholders.productUrl}
                    />
                    <div style={styles.hint}>{t.hints.productUrl}</div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.field}>
                      <div style={styles.label}>{t.fields.productTitle}</div>
                      <input
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        style={styles.input}
                        placeholder={t.placeholders.productTitle}
                      />
                    </div>
                    <div style={styles.field}>
                      <div style={styles.label}>{t.fields.duration}</div>
                      <input
                        type="number"
                        min={10}
                        max={60}
                        value={durationSec}
                        onChange={(e) => setDurationSec(Number(e.target.value))}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.highlights}</div>
                    <textarea
                      value={productHighlights}
                      onChange={(e) => setProductHighlights(e.target.value)}
                      style={styles.textarea}
                    />
                  </div>

                  <div style={styles.divider} />

                  <div style={styles.field}>
                    <div style={styles.label}>{t.fields.assets}</div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}>
                        <span style={styles.label}>{t.fields.logo}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onPickLogo}
                          style={styles.input}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}>
                        <span style={styles.label}>{t.fields.images}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={onPickImages}
                          style={styles.input}
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div style={styles.divider} />

              <div style={styles.row}>
                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.brand}</div>
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.slogan}</div>
                  <input
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>{t.fields.descriptionScript}</div>
                <textarea
                  value={mode === "images" ? text : computed.text}
                  onChange={(e) => setText(e.target.value)}
                  style={styles.textarea}
                />
                <div style={styles.hint}>{t.hints.description}</div>
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.format}</div>
                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value as Ratio)}
                    style={styles.input}
                  >
                    <option value="square">{RATIO_LABEL.square}</option>
                    <option value="vertical">{RATIO_LABEL.vertical}</option>
                    <option value="horizontal">{RATIO_LABEL.horizontal}</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.duration}</div>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button
                  onClick={startRender}
                  disabled={!canRender || status.status === "rendering"}
                  style={styles.primaryBtn(
                    !canRender || status.status === "rendering"
                  )}
                >
                  {status.status === "rendering"
                    ? t.buttons.rendering
                    : t.buttons.generateFinalVideo}
                </button>

                {mode === "text" && (
                  <button
                    onClick={generateSceneVideos}
                    disabled={
                      !storyboard?.scenes?.length ||
                      status.status === "rendering" ||
                      sceneGenerationLocked
                    }
                    style={styles.secondaryBtn}
                  >
                    {t.buttons.generateSceneVideos}
                  </button>
                )}

                <button onClick={resetAll} style={styles.secondaryBtn}>
                  {t.buttons.reset}
                </button>
              </div>

              <div style={styles.mono}>{JSON.stringify(payload, null, 2)}</div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{t.page.preview}</h3>
                <div style={styles.cardSub}>{t.page.previewSub}</div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.small}>{t.states.mode}</div>
                    <div style={styles.statValue}>{MODE_LABEL[mode]}</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.small}>{t.states.scenes}</div>
                    <div style={styles.statValue}>
                      {storyboard?.scenes?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{t.page.progress}</div>
                    <div style={styles.small}>
                      {status.status === "idle" && t.page.ready}
                      {status.status === "rendering" &&
                        (status.phase ? status.phase : t.page.rendering)}
                      {status.status === "done" && t.page.done}
                      {status.status === "error" && t.page.error}
                    </div>
                  </div>

                  <div style={styles.progressWrap}>
                    <div style={styles.progressBar(progressPercent)} />
                  </div>

                  {status.status === "error" && (
                    <div
                      style={{ marginTop: 10, color: "#ffb4b4", fontWeight: 800 }}
                    >
                      {status.error}
                    </div>
                  )}
                </div>

                {status.status !== "done" && (
                  <div
                    style={{
                      borderRadius: 18,
                      border: "1px dashed rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}
                    >
                      {status.status === "rendering"
                        ? t.states.renderingYourVideo
                        : t.states.noPreviewYet}
                    </div>

                    <div style={styles.small}>
                      {status.status === "idle" && t.states.idleHelp}
                      {status.status === "rendering" && t.states.renderingHelp}
                      {status.status === "error" && t.states.errorHelp}
                    </div>

                    {(logoUrl || imageUrls.length > 0) && (
                      <>
                        <div style={styles.divider} />
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>
                          {t.states.assets}
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {logoUrl && (
                            <div
                              style={{
                                ...styles.thumb,
                                width: 90,
                                height: 90,
                                aspectRatio: "auto",
                              }}
                            >
                              <img
                                src={logoUrl}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          )}

                          {imageUrls.slice(0, 5).map((u) => (
                            <div
                              key={u}
                              style={{
                                ...styles.thumb,
                                width: 90,
                                height: 90,
                                aspectRatio: "auto",
                              }}
                            >
                              <img
                                src={u}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {status.status === "done" && (
                  <>
                    <video style={styles.video} controls src={status.url} />

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      <a style={styles.linkBtn} href={status.url} download>
                        {t.buttons.downloadMp4}
                      </a>

                      <button
                        style={styles.secondaryBtn}
                        onClick={() =>
                          setStatus({
                            status: "idle",
                            progress: 0,
                            phase: "",
                          })
                        }
                      >
                        {t.buttons.createAnother}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{t.page.quickSummary}</h3>
                <div style={styles.cardSub}>{t.page.quickSummarySub}</div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.projectBrand}</div>
                  <input value={computed.brand} readOnly style={styles.input} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>{t.fields.headlineCta}</div>
                  <input value={computed.slogan} readOnly style={styles.input} />
                </div>

                {storyboard && (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>{t.fields.storyboardTitle}</div>
                      <input value={storyboard.title} readOnly style={styles.input} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>{t.fields.sceneStatus}</div>
                      <div style={{ ...styles.storyboardCard, marginTop: 0 }}>
                        {storyboard.scenes.map((scene, index) => (
                          <div
                            key={scene.id ?? index}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "8px 0",
                              borderBottom:
                                index === storyboard.scenes.length - 1
                                  ? "none"
                                  : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {t.fields.scenes} {index + 1}
                            </div>
                            <div style={styles.small}>
                              {t.states.image}:{" "}
                              {scene.imageUrl ? t.states.yes : t.states.no} /{" "}
                              {t.states.video}:{" "}
                              {scene.videoUrl ? t.states.yes : t.states.no}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </AppPageShell>

      {upgradeModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{t.modal.title}</h3>

            <div style={styles.modalText}>
              {upgradeMessage || t.modal.fallback}
            </div>

            <div style={styles.modalInfo}>
              <div>
                <b>{t.fields.currentPlan}:</b> {upgradeDetails?.planLabel ?? "-"}
              </div>
              <div>
                <b>{t.fields.remainingCredits}:</b>{" "}
                {typeof upgradeDetails?.remainingCredits === "number"
                  ? upgradeDetails.remainingCredits
                  : "-"}
              </div>
              <div>
                <b>{t.fields.maxDuration}:</b>{" "}
                {typeof upgradeDetails?.maxDurationSec === "number"
                  ? `${upgradeDetails.maxDurationSec}s`
                  : "-"}
              </div>
              <div>
                <b>{t.fields.usedThisMonth}:</b>{" "}
                {typeof upgradeDetails?.usedThisMonth === "number"
                  ? upgradeDetails.usedThisMonth
                  : "-"}
              </div>
            </div>

            <div style={{ ...styles.actions, marginTop: 18 }}>
              <button
                style={styles.primaryBtn(false)}
                onClick={() => {
                  window.location.href = "/billing";
                }}
              >
                {t.buttons.choosePlan}
              </button>

              <button
                style={styles.secondaryBtn}
                onClick={() => {
                  setUpgradeModalOpen(false);
                }}
              >
                {t.buttons.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}