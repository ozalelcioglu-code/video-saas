import { AppPageShell } from "../../components/AppPageShell";

export default function SettingsPage() {
  const card: React.CSSProperties = {
    background: "rgba(10,18,33,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    maxWidth: 760,
  };

  const field: React.CSSProperties = {
    display: "grid",
    gap: 8,
    marginBottom: 14,
  };

  const label: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(231,238,249,0.74)",
    fontWeight: 800,
    textTransform: "uppercase",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(4,10,20,0.65)",
    color: "#e7eef9",
    outline: "none",
  };

  return (
    <AppPageShell
      title="Settings"
      subtitle="Personalize your workspace and future platform preferences."
    >
      <div style={card}>
        <div style={field}>
          <div style={label}>Workspace Name</div>
          <input style={input} defaultValue="Duble-S Motion AI" />
        </div>

        <div style={field}>
          <div style={label}>Default Brand</div>
          <input style={input} defaultValue="Duble-S Technology" />
        </div>

        <div style={field}>
          <div style={label}>Default Export Ratio</div>
          <input style={input} defaultValue="Square (1:1)" />
        </div>
      </div>
    </AppPageShell>
  );
}