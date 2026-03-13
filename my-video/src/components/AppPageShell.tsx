import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppPageShell({
  title,
  subtitle,
  children,
  rightSlot,
  showSidebar = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  showSidebar?: boolean;
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
      gridTemplateColumns: showSidebar ? "270px 1fr" : "1fr",
      minHeight: "100vh",
    } as React.CSSProperties,
    main: {
      padding: 22,
      background:
        "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(900px 450px at 90% 0%, rgba(139,92,246,0.12), transparent 45%), #06101d",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        {showSidebar ? <AppSidebar /> : null}

        <main style={styles.main}>
          <AppHeader title={title} subtitle={subtitle} rightSlot={rightSlot} />
          {children}
        </main>
      </div>
    </div>
  );
}