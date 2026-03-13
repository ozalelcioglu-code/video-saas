"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "../provider/LanguageProvider";

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = useMemo(
    () => [
      { href: "/", label: t.nav.createVideo },
      { href: "/dashboard", label: t.nav.dashboard },
      { href: "/videos", label: t.nav.myVideos },
      { href: "/templates", label: t.nav.templates },
      { href: "/billing", label: t.nav.billing },
      { href: "/settings", label: t.nav.settings },
    ],
    [t]
  );

  const styles = {
    sidebar: {
      borderRight: "1px solid rgba(255,255,255,0.08)",
      background:
        "linear-gradient(180deg, rgba(10,18,33,0.98), rgba(8,15,28,0.98))",
      padding: 20,
      display: "flex",
      flexDirection: "column" as const,
      gap: 22,
      minHeight: "100vh",
    },
    brandWrap: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      paddingBottom: 18,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
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
    },
    brandTitle: {
      fontSize: 20,
      fontWeight: 900,
      letterSpacing: -0.3,
      lineHeight: 1.1,
      margin: 0,
      color: "#e7eef9",
    } as React.CSSProperties,
    brandSub: {
      marginTop: 4,
      fontSize: 12,
      color: "rgba(231,238,249,0.62)",
    },
    nav: {
      display: "grid",
      gap: 8,
    } as React.CSSProperties,
    navItem: (active: boolean) =>
      ({
        display: "block",
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
        textDecoration: "none",
      }) as React.CSSProperties,
    sidebarFooter: {
      marginTop: "auto",
      display: "grid",
      gap: 10,
    } as React.CSSProperties,
    badge: {
      padding: "7px 11px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#d7e4f7",
      whiteSpace: "nowrap" as const,
      width: "fit-content",
    },
    sidebarMuted: {
      fontSize: 12,
      color: "rgba(231,238,249,0.5)",
      lineHeight: 1.5,
    },
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandWrap}>
        <div style={styles.brandLogo}>
          <img
            src="/Professional Emblem Logo in Blue and Silver.png"
            alt="Duble-S Motion AI"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div>
          <h1 style={styles.brandTitle}>Duble-S Motion AI</h1>
          <div style={styles.brandSub}>{t.sidebar.platform}</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={styles.navItem(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={styles.sidebarFooter}>
        <div style={styles.badge}>{t.sidebar.engine}</div>
        <div style={styles.sidebarMuted}>{t.sidebar.creditsInfo}</div>
      </div>
    </aside>
  );
}