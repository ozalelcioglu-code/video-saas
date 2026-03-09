"use client";

import { authClient } from "../lib/auth-client";

type Props = {
  name?: string | null;
  email?: string | null;
  planLabel?: string | null;
  remainingCredits?: number | null;
};

export function UserPanel({
  name,
  email,
  planLabel,
  remainingCredits,
}: Props) {
  const styles = {
    wrap: {
      display: "grid",
      gap: 10,
      marginTop: 14,
      paddingTop: 16,
      borderTop: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    userBox: {
      padding: "12px 14px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    name: {
      color: "#f5f9ff",
      fontWeight: 800,
      fontSize: 14,
      marginBottom: 4,
    } as React.CSSProperties,
    email: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 12,
      wordBreak: "break-word" as const,
      marginBottom: 8,
    } as React.CSSProperties,
    meta: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "rgba(59,130,246,0.14)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#d7ebff",
    } as React.CSSProperties,
    button: {
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      color: "#dce8f8",
      cursor: "pointer",
      fontWeight: 800,
      width: "100%",
    } as React.CSSProperties,
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.userBox}>
        <div style={styles.name}>{name || "Signed in user"}</div>
        <div style={styles.email}>{email || "-"}</div>

        <div style={styles.meta}>
          <div style={styles.badge}>{planLabel || "Free"}</div>
          <div style={styles.badge}>
            {remainingCredits === null
              ? "Unlimited credits"
              : `${remainingCredits} credits left`}
          </div>
        </div>
      </div>

      <button style={styles.button} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}