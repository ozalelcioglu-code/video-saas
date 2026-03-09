import React from "react";
import { AppSidebar } from "./AppSidebar";

export function AppPageShell({
  title,
  subtitle,
  children,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
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
      maxWidth: 760,
      lineHeight: 1.5,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <AppSidebar />
        <main style={styles.main}>
          <div style={styles.topbar}>
            <div>
              <h2 style={styles.topTitle}>{title}</h2>
              {subtitle ? <div style={styles.topSub}>{subtitle}</div> : null}
            </div>
            {rightSlot}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}