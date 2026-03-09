import React from "react";
import { AppPageShell } from "../../components/AppPageShell";

export default function TemplatesPage() {
  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  };

  const card: React.CSSProperties = {
    background: "rgba(10,18,33,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 18,
    minHeight: 160,
    boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
  };

  const title: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 8,
  };

  const muted: React.CSSProperties = {
    color: "rgba(231,238,249,0.62)",
    fontSize: 13,
    lineHeight: 1.5,
  };

  return (
    <AppPageShell
      title="Templates"
      subtitle="Prebuilt styles for product ads, cinematic promos, and social reels."
    >
      <div style={grid}>
        <div style={card}>
          <div style={title}>Cinematic Ad</div>
          <div style={muted}>Premium visuals, smooth transitions, strong brand feel.</div>
        </div>
        <div style={card}>
          <div style={title}>Product Promo</div>
          <div style={muted}>E-commerce friendly layout for items, highlights, and CTA.</div>
        </div>
        <div style={card}>
          <div style={title}>Social Reel</div>
          <div style={muted}>Fast-cut mobile-first format for TikTok, Reels, and Shorts.</div>
        </div>
      </div>
    </AppPageShell>
  );
}