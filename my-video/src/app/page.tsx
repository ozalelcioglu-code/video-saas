"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "../components/AppSidebar";
type Ratio = "square" | "vertical" | "horizontal";
type Mode = "images" | "text" | "product";

type RenderStatus =
  | { status: "idle"; progress: number; phase: string }
  | { status: "rendering"; progress: number; phase: string }
  | { status: "done"; progress: number; phase: string; url?: string }
  | { status: "error"; progress: number; phase: string; error?: string };

type StoryboardScene = {
  id?: string;
  title: string;
  prompt: string;
  imagePrompt?: string;
  onScreenText?: string;
  durationSec: number;
  imageUrl?: string;
  videoUrl?: string;
};

type StoryboardData = {
  language?: "en" | "tr";
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

const MODE_LABEL: Record<Mode, string> = {
  images: "Image to Video",
  text: "Text to Video",
  product: "URL to Video",
};

const RATIO_LABEL: Record<Ratio, string> = {
  square: "Square (1:1)",
  vertical: "Vertical (9:16)",
  horizontal: "Horizontal (16:9)",
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

export default function Page() {
  const [mode, setMode] = useState<Mode>("text");

  const [brand, setBrand] = useState("Duble-S Technology");
  const [slogan, setSlogan] = useState("Digital Solutions for Modern Businesses");
  const [text, setText] = useState(
    "We build modern websites and custom software. Fast, secure, scalable."
  );

  const [durationSec, setDurationSec] = useState(24);
  const [ratio, setRatio] = useState<Ratio>("square");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [prompt, setPrompt] = useState(
    "Create a cinematic 20–30s marketing video for a web development & software company. Emphasize speed, quality, and trust."
  );

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

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const computed = useMemo(() => {
    if (mode === "text") {
      const derivedBrand = brand || "Your Brand";
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
      const title = productTitle.trim() || "Your Product";
      const url = productUrl.trim();
      const highlights = productHighlights
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);

      const derivedBrand = brand || "Your Store";
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
        phase: "Logo upload failed",
        error: err?.message ?? "Logo upload failed",
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
        phase: "Image upload failed",
        error: err?.message ?? "Image upload failed",
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
          language: "en",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Storyboard generation failed");
      }

      if (!data?.storyboard) {
        throw new Error("No storyboard returned");
      }

      setStoryboard(data.storyboard);
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
  }

  async function generateSceneVideos() {
    if (!storyboard?.scenes?.length) {
      alert("Storyboard scenes not found");
      return;
    }

    try {
      setStatus({
        status: "rendering",
        progress: 10,
        phase: "Generating scene videos...",
      });

      const updatedScenes: StoryboardScene[] = [];
      const total = storyboard.scenes.length;

      for (let index = 0; index < total; index++) {
        const scene = storyboard.scenes[index];

        if (!scene.imageUrl) {
          updatedScenes.push(scene);
          continue;
        }

        setStatus({
          status: "rendering",
          progress: clamp(10 + Math.round((index / total) * 80), 10, 90),
          phase: `Generating scene video ${index + 1}/${total}...`,
        });

        try {
          const res = await fetch("/api/ai/video", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: scene.imageUrl,
              prompt: scene.prompt,
            }),
          });

          const data = await res.json();

          if (data.ok && data.videoUrl) {
            updatedScenes.push({
              ...scene,
              videoUrl: data.videoUrl,
            });
          } else {
            updatedScenes.push(scene);
          }
        } catch (error) {
          console.error("Scene video generation failed:", error);
          updatedScenes.push(scene);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setStoryboard({
        ...storyboard,
        scenes: updatedScenes,
      });

      setStatus({
        status: "idle",
        progress: 0,
        phase: "Scene videos generated",
      });
    } catch (error) {
      console.error(error);

      setStatus({
        status: "error",
        progress: 0,
        phase: "Scene video generation failed",
        error: "Scene video generation failed",
      });
    }
  }

  async function startRender() {
    if (!baseUrl) {
      setStatus({
        status: "error",
        progress: 0,
        phase: "Base URL not ready",
        error: "baseUrl not ready. Refresh once.",
      });
      return;
    }

    setStatus({
      status: "rendering",
      progress: 5,
      phase: "Preparing request...",
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
        throw new Error(data?.error ?? "Render failed");
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
              phase: msg.phase || "Rendering...",
            });
          }

          if (msg?.type === "done" && msg?.url) {
            finalUrl = msg.url;
          }

          if (msg?.type === "error") {
            finalError = msg.error || "Render failed";
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
          phase: "Render complete",
          url: finalUrl,
        });
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Render failed");
      }

      if (!data?.url) {
        throw new Error("Render finished but no video URL returned");
      }

      setStatus({
        status: "done",
        progress: 100,
        phase: "Render complete",
        url: data.url,
      });
    } catch (err: any) {
      setStatus({
        status: "error",
        progress: 0,
        phase: "Render failed",
        error: err?.message ?? "Render failed",
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
    page: {
      minHeight: "100vh",
      background: "#06101d",
      color: "#e7eef9",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    } as React.CSSProperties,

    layout: {
      display: "grid",
      gridTemplateColumns: "270px 1fr",
      minHeight: "100vh",
    } as React.CSSProperties,

    sidebar: {
      borderRight: "1px solid rgba(255,255,255,0.08)",
      background:
        "linear-gradient(180deg, rgba(10,18,33,0.98), rgba(8,15,28,0.98))",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 22,
    } as React.CSSProperties,

    brandWrap: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      paddingBottom: 18,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,

    brandLogo: {
      width: 54,
      height: 54,
      borderRadius: 16,
      overflow: "hidden",
      flexShrink: 0,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
      border: "1px solid rgba(255,255,255,0.1)",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
    } as React.CSSProperties,

    brandTitle: {
      fontSize: 20,
      fontWeight: 900,
      letterSpacing: -0.3,
      lineHeight: 1.1,
      margin: 0,
    } as React.CSSProperties,

    brandSub: {
      marginTop: 4,
      fontSize: 12,
      color: "rgba(231,238,249,0.62)",
    } as React.CSSProperties,

    nav: {
      display: "grid",
      gap: 8,
    } as React.CSSProperties,

    navItem: (active: boolean) =>
      ({
        padding: "12px 14px",
        borderRadius: 14,
        border: active
          ? "1px solid rgba(59,130,246,0.38)"
          : "1px solid transparent",
        background: active
          ? "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(139,92,246,0.14))"
          : "transparent",
        color: active ? "#f5f9ff" : "rgba(231,238,249,0.78)",
        fontWeight: 700,
        fontSize: 14,
        textAlign: "left",
        cursor: "pointer",
      }) as React.CSSProperties,

    sidebarFooter: {
      marginTop: "auto",
      display: "grid",
      gap: 10,
    } as React.CSSProperties,

    sidebarMuted: {
      fontSize: 12,
      color: "rgba(231,238,249,0.5)",
    } as React.CSSProperties,

    main: {
      padding: 22,
      background:
        "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(900px 450px at 90% 0%, rgba(139,92,246,0.12), transparent 45%), #06101d",
    } as React.CSSProperties,

    topbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      marginBottom: 18,
    } as React.CSSProperties,

    topTitle: {
      fontSize: 30,
      fontWeight: 950,
      margin: 0,
      letterSpacing: -0.5,
    } as React.CSSProperties,

    topSub: {
      marginTop: 8,
      fontSize: 14,
      color: "rgba(231,238,249,0.68)",
      maxWidth: 680,
      lineHeight: 1.5,
    } as React.CSSProperties,

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
      resize: "vertical",
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
      flexWrap: "wrap",
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
      overflowX: "auto",
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
  };

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <AppSidebar />

        <main style={styles.main}>
          <div style={styles.topbar}>
            <div>
              <h2 style={styles.topTitle}>Create AI Video</h2>
              <div style={styles.topSub}>
                Generate cinematic ad videos from text, uploaded images, or product URLs.
                Your working engines stay untouched — only the experience gets cleaner.
              </div>
            </div>

            <div style={styles.topBadges}>
              <div style={styles.badge}>{MODE_LABEL[mode]}</div>
              <div style={styles.badge}>{RATIO_LABEL[ratio]}</div>
              <div style={styles.badge}>
                {status.status === "rendering"
                  ? status.phase || "Rendering"
                  : status.status === "done"
                    ? "Ready"
                    : status.status === "error"
                      ? "Error"
                      : "Idle"}
              </div>
            </div>
          </div>

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
                <h3 style={styles.cardTitle}>Project Setup</h3>
                <div style={styles.cardSub}>
                  Configure your brand, source mode, scenes, and generation flow from a
                  single workspace.
                </div>
              </div>

              <div style={styles.cardBody}>
                {mode === "images" && (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>Logo</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPickLogo}
                        style={styles.input}
                      />
                      <div style={styles.hint}>
                        Upload a square transparent logo for the cleanest brand result.
                      </div>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Images</div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onPickImages}
                        style={styles.input}
                      />
                      <div style={styles.hint}>
                        Upload up to 6 images. Use clean, high-resolution assets.
                      </div>

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
                      <div style={styles.label}>AI Ad Idea</div>
                      <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        style={{ ...styles.textarea, minHeight: 130 }}
                        placeholder="Create a cinematic ad for a coffee shop in Berlin"
                      />
                      <div style={styles.hint}>
                        This idea powers storyboard generation, scene prompts, images, and
                        final motion clips.
                      </div>
                    </div>

                    <div style={styles.actions}>
                      <button
                        onClick={generateStoryboard}
                        disabled={storyboardLoading || !idea.trim()}
                        style={styles.primaryBtn(storyboardLoading || !idea.trim())}
                      >
                        {storyboardLoading ? "Generating Storyboard..." : "Generate Storyboard"}
                      </button>

                      <button
                        onClick={generateSceneVideos}
                        disabled={
                          storyboardLoading ||
                          !storyboard?.scenes?.length ||
                          status.status === "rendering"
                        }
                        style={styles.secondaryBtn}
                      >
                        Generate Scene Videos
                      </button>
                    </div>

                    {storyboardError && (
                      <div style={{ marginTop: 10, color: "#ffb4b4", fontWeight: 800 }}>
                        {storyboardError}
                      </div>
                    )}

                    {storyboard && (
                      <div style={styles.storyboardCard}>
                        <div style={styles.field}>
                          <div style={styles.label}>Storyboard Title</div>
                          <input
                            value={storyboard.title}
                            onChange={(e) => updateStoryboardTitle(e.target.value)}
                            style={styles.input}
                          />
                        </div>

                        <div style={{ ...styles.small, marginBottom: 12 }}>
                          Vibe: <b>{storyboard?.brand_tone?.vibe ?? "-"}</b> — Keywords:{" "}
                          {storyboard?.brand_tone?.keywords?.join(", ") ?? "-"}
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>Hook</div>
                          <textarea
                            value={storyboard?.script?.hook ?? ""}
                            onChange={(e) => updateStoryboardHook(e.target.value)}
                            style={{ ...styles.textarea, minHeight: 80 }}
                          />
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>CTA</div>
                          <input
                            value={storyboard?.script?.cta ?? ""}
                            onChange={(e) => updateStoryboardCta(e.target.value)}
                            style={styles.input}
                          />
                        </div>

                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Body Lines</div>
                        {storyboard?.script?.body?.map((line, index) => (
                          <div key={index} style={{ ...styles.row, marginBottom: 8 }}>
                            <input
                              value={line}
                              onChange={(e) => updateStoryboardBody(index, e.target.value)}
                              style={styles.input}
                            />
                            <button
                              style={styles.dangerBtn}
                              onClick={() => removeStoryboardBodyLine(index)}
                            >
                              Remove line
                            </button>
                          </div>
                        ))}

                        <div style={styles.actions}>
                          <button style={styles.secondaryBtn} onClick={addStoryboardBodyLine}>
                            Add Body Line
                          </button>
                        </div>

                        <div style={styles.divider} />

                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Scenes</div>

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
                              <div style={{ fontWeight: 900 }}>Scene {index + 1}</div>
                              <button
                                style={styles.dangerBtn}
                                onClick={() => removeStoryboardScene(index)}
                              >
                                Remove scene
                              </button>
                            </div>

                            <div style={styles.field}>
                              <div style={styles.label}>Scene Title</div>
                              <input
                                value={scene.title}
                                onChange={(e) =>
                                  updateStoryboardScene(index, "title", e.target.value)
                                }
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.row}>
                              <div style={styles.field}>
                                <div style={styles.label}>On-screen text</div>
                                <input
                                  value={scene.onScreenText ?? ""}
                                  onChange={(e) =>
                                    updateStoryboardScene(index, "onScreenText", e.target.value)
                                  }
                                  style={styles.input}
                                />
                              </div>

                              <div style={styles.field}>
                                <div style={styles.label}>Duration</div>
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
                              <div style={styles.label}>Scene Prompt</div>
                              <textarea
                                value={scene.prompt}
                                onChange={(e) =>
                                  updateStoryboardScene(index, "prompt", e.target.value)
                                }
                                style={{ ...styles.textarea, minHeight: 110 }}
                              />
                            </div>

                            <div style={styles.field}>
                              <div style={styles.label}>Image Prompt</div>
                              <textarea
                                value={scene.imagePrompt ?? ""}
                                onChange={(e) =>
                                  updateStoryboardScene(index, "imagePrompt", e.target.value)
                                }
                                style={{ ...styles.textarea, minHeight: 90 }}
                              />
                            </div>

                            <div style={styles.small}>
                              Image: {scene.imageUrl ? "Yes" : "No"} — Video:{" "}
                              {scene.videoUrl ? "Yes" : "No"}
                            </div>
                          </div>
                        ))}

                        <div style={styles.actions}>
                          <button
                            style={styles.secondaryBtn}
                            onClick={addStoryboardScene}
                            disabled={storyboard.scenes.length >= 7}
                          >
                            Add Scene
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {mode === "product" && (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>Product URL</div>
                      <input
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        style={styles.input}
                        placeholder="https://yourstore.com/products/..."
                      />
                      <div style={styles.hint}>
                        URL scraping can later automate title, images, and highlights.
                      </div>
                    </div>

                    <div style={styles.row}>
                      <div style={styles.field}>
                        <div style={styles.label}>Product Title</div>
                        <input
                          value={productTitle}
                          onChange={(e) => setProductTitle(e.target.value)}
                          style={styles.input}
                          placeholder="Product name"
                        />
                      </div>
                      <div style={styles.field}>
                        <div style={styles.label}>Duration</div>
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
                      <div style={styles.label}>Highlights</div>
                      <textarea
                        value={productHighlights}
                        onChange={(e) => setProductHighlights(e.target.value)}
                        style={styles.textarea}
                      />
                    </div>

                    <div style={styles.divider} />

                    <div style={styles.field}>
                      <div style={styles.label}>Assets</div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}>
                          <span style={styles.label}>Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={onPickLogo}
                            style={styles.input}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}>
                          <span style={styles.label}>Images</span>
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
                    <div style={styles.label}>Brand</div>
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Slogan</div>
                    <input
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Description / Script</div>
                  <textarea
                    value={mode === "images" ? text : computed.text}
                    onChange={(e) => setText(e.target.value)}
                    style={styles.textarea}
                  />
                  <div style={styles.hint}>
                    Keep this short and punchy. It shapes the ad direction.
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.field}>
                    <div style={styles.label}>Format</div>
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
                    <div style={styles.label}>Duration</div>
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
                    style={styles.primaryBtn(!canRender || status.status === "rendering")}
                  >
                    {status.status === "rendering" ? "Rendering..." : "Generate Final Video"}
                  </button>

                  {mode === "text" && (
                    <button
                      onClick={generateSceneVideos}
                      disabled={
                        !storyboard?.scenes?.length || status.status === "rendering"
                      }
                      style={styles.secondaryBtn}
                    >
                      Generate Scene Videos
                    </button>
                  )}

                  <button onClick={resetAll} style={styles.secondaryBtn}>
                    Reset
                  </button>
                </div>

                <div style={styles.mono}>{JSON.stringify(payload, null, 2)}</div>
              </div>
            </section>

            <section style={{ display: "grid", gap: 18 }}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Preview</h3>
                  <div style={styles.cardSub}>
                    Final output appears here when rendering is complete.
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                      <div style={styles.small}>Mode</div>
                      <div style={styles.statValue}>{MODE_LABEL[mode]}</div>
                    </div>

                    <div style={styles.statCard}>
                      <div style={styles.small}>Scenes</div>
                      <div style={styles.statValue}>{storyboard?.scenes?.length ?? 0}</div>
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
                      <div style={{ fontWeight: 900 }}>Progress</div>
                      <div style={styles.small}>
                        {status.status === "idle" && "Ready"}
                        {status.status === "rendering" &&
                          (status.phase ? status.phase : "Rendering...")}
                        {status.status === "done" && "Done"}
                        {status.status === "error" && "Error"}
                      </div>
                    </div>

                    <div style={styles.progressWrap}>
                      <div style={styles.progressBar(progressPercent)} />
                    </div>

                    {status.status === "error" && (
                      <div style={{ marginTop: 10, color: "#ffb4b4", fontWeight: 800 }}>
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
                      <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
                        {status.status === "rendering" ? "Rendering your video..." : "No preview yet"}
                      </div>

                      <div style={styles.small}>
                        {status.status === "idle" &&
                          "Generate storyboard, scene videos, then render the final video."}
                        {status.status === "rendering" &&
                          "The system is processing scenes and preparing the final output."}
                        {status.status === "error" &&
                          "Fix the issue and run the generation again."}
                      </div>

                      {(logoUrl || imageUrls.length > 0) && (
                        <>
                          <div style={styles.divider} />
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Assets</div>

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

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        <a style={styles.linkBtn} href={status.url} download>
                          Download MP4
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
                          Create another
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Quick Summary</h3>
                  <div style={styles.cardSub}>
                    A fast overview of the active project and generation state.
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.field}>
                    <div style={styles.label}>Project Brand</div>
                    <input value={computed.brand} readOnly style={styles.input} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Headline / CTA</div>
                    <input value={computed.slogan} readOnly style={styles.input} />
                  </div>

                  {storyboard && (
                    <>
                      <div style={styles.field}>
                        <div style={styles.label}>Storyboard Title</div>
                        <input value={storyboard.title} readOnly style={styles.input} />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Scene Status</div>
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
                                Scene {index + 1}
                              </div>
                              <div style={styles.small}>
                                Image: {scene.imageUrl ? "Yes" : "No"} / Video:{" "}
                                {scene.videoUrl ? "Yes" : "No"}
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
        </main>
      </div>
    </div>
  );
}