"use client";

import React, { useEffect, useMemo, useState } from "react";

type Ratio = "square" | "vertical" | "horizontal";
type Mode = "images" | "text" | "product";

type RenderStatus =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "done"; url: string }
  | { status: "error"; error: string };

type StoryboardScene = {
  title: string;
  prompt: string;
  on_screen_text: string;
  duration_sec: number;
};

type StoryboardData = {
  language: "en" | "tr";
  title: string;
  brand_tone: {
    keywords: string[];
    vibe: "premium" | "modern" | "friendly" | "bold" | "minimal";
  };
  script: {
    hook: string;
    body: string[];
    cta: string;
  };
  scenes: StoryboardScene[];
};

const MODE_LABEL: Record<Mode, string> = {
  images: "Images → Video",
  text: "Text → Video",
  product: "Product URL → Video",
};

const RATIO_LABEL: Record<Ratio, string> = {
  square: "Square (1:1)",
  vertical: "Vertical (9:16)",
  horizontal: "Horizontal (16:9)",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("images");

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

  const [idea, setIdea] = useState("");
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardError, setStoryboardError] = useState("");

  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState<RenderStatus>({ status: "idle" });

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
      const derivedSlogan = slogan || "Shop now • Fast shipping • Secure checkout";

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
  }, [mode, prompt, productTitle, productHighlights, productUrl, brand, slogan, text, storyboard]);

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

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error ?? "Upload failed");
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
      setStatus({ status: "error", error: err?.message ?? "Logo upload failed" });
    }
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const urls = await uploadFiles(files);
      setImageUrls((prev) => [...prev, ...urls].slice(0, 6));
    } catch (err: any) {
      setStatus({ status: "error", error: err?.message ?? "Image upload failed" });
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

      if (!res.ok) {
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

      if (field === "duration_sec") {
        scene.duration_sec = clamp(Number(value) || 2, 2, 10);
      } else if (field === "title") {
        scene.title = String(value);
      } else if (field === "prompt") {
        scene.prompt = String(value);
      } else if (field === "on_screen_text") {
        scene.on_screen_text = String(value);
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
            on_screen_text: "New Scene",
            duration_sec: 4,
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
    setStatus({ status: "idle" });
    setLogoUrl(null);
    setImageUrls([]);
    setStoryboard(null);
    setStoryboardError("");
    setIdea("");
  }

  async function startRender() {
  if (!baseUrl) {
    setStatus({ status: "error", error: "baseUrl not ready. Refresh once." });
    return;
  }

  setStatus({ status: "rendering" });

  const finalPayload =
    mode === "text" && storyboard
      ? {
          ...payload,
          slogan: storyboard.script.cta || payload.slogan,
          text: storyboard.script.body.join(" "),
          storyboard: storyboard.scenes.map((s) => ({
            type: "value",
            bullets: [s.on_screen_text || s.title],
            seconds: s.duration_sec,
            prompt: s.prompt,
            title: s.title,
          })),
        }
      : payload;

  try {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(finalPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus({
        status: "error",
        error: data?.error ?? "Render failed",
      });
      return;
    }

    setStatus({
      status: "done",
      url: data.url,
    });
  } catch (err: any) {
    setStatus({
      status: "error",
      error: err?.message ?? "Render failed",
    });
  }
}

  const canRender =
    durationSec >= 10 &&
    durationSec <= 60 &&
    (mode === "images" ? imageUrls.length > 0 || !!logoUrl : true);

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 20% 0%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(56,189,248,0.20), transparent 55%), linear-gradient(180deg, #050814, #060a18 60%, #070b1b)",
      color: "#eaf0ff",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    } as React.CSSProperties,
    wrap: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "28px 18px 60px",
    } as React.CSSProperties,
    topbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      marginBottom: 18,
    } as React.CSSProperties,
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    } as React.CSSProperties,
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "rgba(56,189,248,0.15)",
      border: "1px solid rgba(56,189,248,0.25)",
      color: "#cfefff",
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    h1: {
      fontSize: 28,
      fontWeight: 900,
      margin: 0,
      letterSpacing: -0.4,
    } as React.CSSProperties,
    sub: {
      marginTop: 6,
      fontSize: 14,
      color: "rgba(234,240,255,0.72)",
    } as React.CSSProperties,
    grid: {
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: 16,
      alignItems: "start",
    } as React.CSSProperties,
    card: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 18,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      overflow: "hidden",
    } as React.CSSProperties,
    cardHeader: {
      padding: "16px 16px 0",
    } as React.CSSProperties,
    cardBody: {
      padding: 16,
    } as React.CSSProperties,
    tabs: {
      display: "flex",
      gap: 10,
      padding: 12,
      background: "rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    tabBtn: (active: boolean) =>
      ({
        flex: 1,
        padding: "12px 12px",
        borderRadius: 14,
        border: active ? "1px solid rgba(99,102,241,0.55)" : "1px solid rgba(255,255,255,0.10)",
        background: active
          ? "linear-gradient(180deg, rgba(99,102,241,0.35), rgba(99,102,241,0.12))"
          : "rgba(255,255,255,0.04)",
        color: active ? "#f3f5ff" : "rgba(234,240,255,0.85)",
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 13,
      }) as React.CSSProperties,
    field: {
      display: "grid",
      gap: 6,
      marginBottom: 12,
    } as React.CSSProperties,
    label: {
      fontSize: 12,
      color: "rgba(234,240,255,0.78)",
      fontWeight: 700,
      letterSpacing: 0.2,
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(5,8,20,0.55)",
      color: "#eaf0ff",
      outline: "none",
    } as React.CSSProperties,
    textarea: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(5,8,20,0.55)",
      color: "#eaf0ff",
      outline: "none",
      resize: "vertical",
      minHeight: 92,
    } as React.CSSProperties,
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    } as React.CSSProperties,
    hint: {
      fontSize: 12,
      color: "rgba(234,240,255,0.65)",
      marginTop: 6,
      lineHeight: 1.35,
    } as React.CSSProperties,
    divider: {
      height: 1,
      background: "rgba(255,255,255,0.10)",
      margin: "12px 0",
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
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(99,102,241,0.55)",
        background: disabled
          ? "rgba(255,255,255,0.08)"
          : "linear-gradient(180deg, rgba(99,102,241,0.65), rgba(99,102,241,0.25))",
        color: disabled ? "rgba(234,240,255,0.55)" : "#f6f7ff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        letterSpacing: 0.2,
        minWidth: 180,
      }) as React.CSSProperties,
    ghostBtn: {
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.05)",
      color: "rgba(234,240,255,0.9)",
      cursor: "pointer",
      fontWeight: 800,
    } as React.CSSProperties,
    dangerBtn: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,120,120,0.30)",
      background: "rgba(255,120,120,0.10)",
      color: "#ffd0d0",
      cursor: "pointer",
      fontWeight: 800,
    } as React.CSSProperties,
    progressWrap: {
      width: "100%",
      height: 12,
      borderRadius: 999,
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.10)",
    } as React.CSSProperties,
    progressBar: (pct: number) =>
      ({
        height: "100%",
        width: `${clamp(pct, 0, 100)}%`,
        background: "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(99,102,241,0.85))",
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
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
    } as React.CSSProperties,
    small: {
      fontSize: 12,
      color: "rgba(234,240,255,0.72)",
    } as React.CSSProperties,
    video: {
      width: "100%",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.35)",
    } as React.CSSProperties,
    linkBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(56,189,248,0.35)",
      background: "rgba(56,189,248,0.12)",
      color: "#d7f4ff",
      textDecoration: "none",
      fontWeight: 900,
      cursor: "pointer",
    } as React.CSSProperties,
    mono: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 12,
      color: "rgba(234,240,255,0.78)",
      background: "rgba(0,0,0,0.22)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 14,
      padding: 12,
      overflowX: "auto",
      marginTop: 12,
    } as React.CSSProperties,
    storyboardCard: {
      padding: 12,
      borderRadius: 14,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
      marginTop: 10,
    } as React.CSSProperties,
  };

  const progressPercent =
    status.status === "rendering" ? 55 : status.status === "done" ? 100 : 0;

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.topbar}>
          <div style={styles.brand}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background:
                  "linear-gradient(180deg, rgba(99,102,241,0.7), rgba(56,189,248,0.35))",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
              }}
            />
            <div>
              <h1 style={styles.h1}>Create a Video Ad</h1>
              <div style={styles.sub}>
                Global SaaS MVP —{" "}
                <span style={{ color: "rgba(234,240,255,0.9)", fontWeight: 800 }}>
                  Duble-S Technology
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={styles.badge}>Templates: Orion B</div>
            <div style={styles.badge}>Render: Remotion</div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.tabs}>
              {(["images", "text", "product"] as Mode[]).map((m) => (
                <button key={m} style={styles.tabBtn(mode === m)} onClick={() => setMode(m)}>
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            <div style={styles.cardBody}>
              {mode === "images" && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>Logo (optional)</div>
                    <input type="file" accept="image/*" onChange={onPickLogo} style={styles.input} />
                    <div style={styles.hint}>Upload a square logo for best results. (PNG recommended)</div>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Images (1–6)</div>
                    <input type="file" accept="image/*" multiple onChange={onPickImages} style={styles.input} />
                    <div style={styles.hint}>Tip: Use high-quality images (at least 1080px).</div>

                    {imageUrls.length > 0 && (
                      <div style={styles.thumbGrid}>
                        {imageUrls.slice(0, 3).map((u) => (
                          <div key={u} style={styles.thumb}>
                            <img
                              src={u}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {logoUrl && (
                    <div style={{ ...styles.field, marginTop: -2 }}>
                      <div style={styles.label}>Logo preview</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ ...styles.thumb, width: 92, height: 92, aspectRatio: "auto" }}>
                          <img
                            src={logoUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </div>
                        <div style={styles.small}>{logoUrl}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === "text" && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>AI Ad Idea</div>
                    <textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      style={{ ...styles.textarea, minHeight: 120 }}
                      placeholder="Create a cinematic ad for a coffee shop in Berlin"
                    />
                    <div style={styles.hint}>
                      Describe the ad idea. OpenAI will generate the storyboard, script and scene prompts.
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
                        Vibe: <b>{storyboard.brand_tone.vibe}</b> — Keywords:{" "}
                        {storyboard.brand_tone.keywords.join(", ")}
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Hook</div>
                        <textarea
                          value={storyboard.script.hook}
                          onChange={(e) => updateStoryboardHook(e.target.value)}
                          style={{ ...styles.textarea, minHeight: 80 }}
                        />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>CTA</div>
                        <input
                          value={storyboard.script.cta}
                          onChange={(e) => updateStoryboardCta(e.target.value)}
                          style={styles.input}
                        />
                      </div>

                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Body Lines</div>
                      {storyboard.script.body.map((line, index) => (
                        <div key={index} style={{ ...styles.row, marginBottom: 8 }}>
                          <input
                            value={line}
                            onChange={(e) => updateStoryboardBody(index, e.target.value)}
                            style={styles.input}
                          />
                          <button style={styles.dangerBtn} onClick={() => removeStoryboardBodyLine(index)}>
                            Remove line
                          </button>
                        </div>
                      ))}

                      <div style={styles.actions}>
                        <button style={styles.ghostBtn} onClick={addStoryboardBodyLine}>
                          Add body line
                        </button>
                      </div>

                      <div style={{ ...styles.divider, marginTop: 16, marginBottom: 16 }} />

                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Scenes</div>

                      {storyboard.scenes.map((scene, index) => (
                        <div key={index} style={{ ...styles.storyboardCard, marginTop: 10 }}>
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
                            <button style={styles.dangerBtn} onClick={() => removeStoryboardScene(index)}>
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
                                value={scene.on_screen_text}
                                onChange={(e) =>
                                  updateStoryboardScene(index, "on_screen_text", e.target.value)
                                }
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <div style={styles.label}>Duration (sec)</div>
                              <input
                                type="number"
                                min={2}
                                max={10}
                                value={scene.duration_sec}
                                onChange={(e) =>
                                  updateStoryboardScene(index, "duration_sec", Number(e.target.value))
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
                              style={{ ...styles.textarea, minHeight: 120 }}
                            />
                          </div>
                        </div>
                      ))}

                      <div style={styles.actions}>
                        <button
                          style={styles.ghostBtn}
                          onClick={addStoryboardScene}
                          disabled={storyboard.scenes.length >= 7}
                        >
                          Add scene
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
                      MVP: scraping later. For now, fill title/highlights manually.
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.field}>
                      <div style={styles.label}>Product title</div>
                      <input
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        style={styles.input}
                        placeholder="Product name"
                      />
                    </div>
                    <div style={styles.field}>
                      <div style={styles.label}>Duration (sec)</div>
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
                    <div style={styles.label}>Highlights (one per line)</div>
                    <textarea
                      value={productHighlights}
                      onChange={(e) => setProductHighlights(e.target.value)}
                      style={styles.textarea}
                    />
                  </div>

                  <div style={styles.divider} />

                  <div style={styles.field}>
                    <div style={styles.label}>Assets</div>
                    <div style={styles.hint}>
                      You can still upload a logo + images for a better product ad.
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                      <label style={{ display: "grid", gap: 6, flex: "1 1 220px" }}>
                        <span style={styles.label}>Logo</span>
                        <input type="file" accept="image/*" onChange={onPickLogo} style={styles.input} />
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
                  This text becomes the “value bullets” in the video. Keep it short and punchy.
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
                  <div style={styles.label}>Duration (sec)</div>
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
                  {status.status === "rendering" ? "Rendering…" : "Generate Video"}
                </button>

                <button onClick={resetAll} style={styles.ghostBtn}>
                  Reset assets
                </button>

                <div style={{ flex: 1 }} />
                <div style={styles.badge}>{MODE_LABEL[mode]}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900 }}>Progress</div>
                  <div style={styles.small}>
                    {status.status === "idle" && "Ready"}
                    {status.status === "rendering" && "Rendering..."}
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

              <div style={styles.mono}>{JSON.stringify(payload, null, 2)}</div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardHeader, paddingBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 950 }}>Preview</div>
                <div style={styles.badge}>{RATIO_LABEL[ratio]}</div>
              </div>

              <div style={{ ...styles.hint, marginTop: 8 }}>
                When rendering finishes, your video appears here with a download button.
              </div>
            </div>

            <div style={{ ...styles.cardBody, paddingTop: 10 }}>
              {status.status !== "done" && (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px dashed rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 18,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
                    {status.status === "rendering" ? "Rendering your video…" : "No preview yet"}
                  </div>

                  <div style={styles.small}>
                    {status.status === "idle" &&
                      "Upload assets or generate storyboard, then click Generate Video."}
                    {status.status === "rendering" &&
                      "Please wait while the video is being rendered on the server."}
                    {status.status === "error" && "Fix the error, then try again."}
                  </div>

                  {(logoUrl || imageUrls.length > 0) && (
                    <>
                      <div style={styles.divider} />
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Assets used</div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {logoUrl && (
                          <div style={{ ...styles.thumb, width: 90, height: 90, aspectRatio: "auto" }}>
                            <img
                              src={logoUrl}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          </div>
                        )}

                        {imageUrls.slice(0, 5).map((u) => (
                          <div key={u} style={{ ...styles.thumb, width: 90, height: 90, aspectRatio: "auto" }}>
                            <img
                              src={u}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {storyboard && mode === "text" && (
                    <>
                      <div style={styles.divider} />
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Storyboard Summary</div>
                      <div style={styles.small}>
                        <b>Title:</b> {storyboard.title}
                      </div>
                      <div style={styles.small}>
                        <b>Scenes:</b> {storyboard.scenes.length}
                      </div>
                      <div style={styles.small}>
                        <b>CTA:</b> {storyboard.script.cta}
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

                    <button style={styles.ghostBtn} onClick={() => setStatus({ status: "idle" })}>
                      Create another
                    </button>
                  </div>

                  <div style={{ ...styles.hint, marginTop: 12 }}>
                    Tip: Add a subtle watermark “Made with Duble-S” for viral growth.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}