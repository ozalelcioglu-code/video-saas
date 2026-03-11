"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { UserPanel } from "./UserPanel";
import {
  getInitialLanguage,
  LANGUAGE_LABELS,
  translations,
  type AppLanguage,
} from "../lib/i18n";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  planLabel?: string | null;
  remainingCredits?: number | null;
};

export function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    setLanguage(getInitialLanguage());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("app-language", language);
    }
  }, [language]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();

        if (data?.ok && data?.user) {
          setUser({
            name: data.user.name ?? null,
            email: data.user.email ?? null,
            planLabel: data.user.planLabel ?? null,
            remainingCredits:
              typeof data.user.remainingCredits === "number" ||
              data.user.remainingCredits === null
                ? data.user.remainingCredits
                : null,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Sidebar user load failed:", error);
        setUser(null);
      }
    };

    loadUser();
  }, []);

  const t = translations[language];

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
    notSignedIn: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 13,
      padding: "12px 14px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    languageWrap: {
      display: "grid",
      gap: 8,
      padding: "12px 14px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    languageLabel: {
      fontSize: 12,
      color: "rgba(231,238,249,0.74)",
      fontWeight: 800,
      letterSpacing: 0.15,
      textTransform: "uppercase" as const,
    } as React.CSSProperties,
    languageSelect: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(4,10,20,0.65)",
      color: "#e7eef9",
      outline: "none",
      fontSize: 14,
    } as React.CSSProperties,
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandWrap}>
        <div style={styles.brandLogo}>
          <img
            src="/Professional Emblem Logo in Blue and Silver.png"
            alt="Duble-S Motion AI"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        <div>
          <h1 style={styles.brandTitle}>Duble-S Motion AI</h1>
          <div style={styles.brandSub}>{t.sidebar.platform}</div>
        </div>
      </div>

      <div style={styles.languageWrap}>
        <div style={styles.languageLabel}>{t.sidebar.language}</div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          style={styles.languageSelect}
        >
          <option value="tr">{LANGUAGE_LABELS.tr}</option>
          <option value="en">{LANGUAGE_LABELS.en}</option>
          <option value="de">{LANGUAGE_LABELS.de}</option>
        </select>
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

      {user ? (
        <UserPanel
          name={user.name ?? null}
          email={user.email ?? null}
          planLabel={user.planLabel ?? null}
          remainingCredits={user.remainingCredits ?? null}
        />
      ) : (
        <div style={styles.notSignedIn}>{t.sidebar.notSignedIn}</div>
      )}

      <div style={styles.sidebarFooter}>
        <div style={styles.badge}>{t.sidebar.engine}</div>
        <div style={styles.sidebarMuted}>{t.sidebar.creditsInfo}</div>
      </div>
    </aside>
  );
}