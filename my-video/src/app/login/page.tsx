"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const check = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.session) {
          window.location.href = "/";
        }
      } catch (error) {
        console.error(error);
      }
    };

    check();
  }, []);

  const styles = {
    page: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background:
        "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(900px 450px at 90% 0%, rgba(139,92,246,0.12), transparent 45%), #06101d",
      color: "#e7eef9",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      padding: 24,
    } as React.CSSProperties,
    card: {
      width: "100%",
      maxWidth: 460,
      background: "rgba(10,18,33,0.9)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 24,
      padding: 24,
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    logoWrap: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginBottom: 22,
    } as React.CSSProperties,
    logo: {
      width: 58,
      height: 58,
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    title: {
      fontSize: 28,
      fontWeight: 900,
      margin: 0,
    } as React.CSSProperties,
    sub: {
      marginTop: 6,
      color: "rgba(231,238,249,0.65)",
      fontSize: 14,
    } as React.CSSProperties,
    tabs: {
      display: "flex",
      gap: 10,
      marginBottom: 18,
    } as React.CSSProperties,
    tab: (active: boolean) =>
      ({
        flex: 1,
        padding: "12px 14px",
        borderRadius: 14,
        border: active
          ? "1px solid rgba(59,130,246,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active
          ? "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))"
          : "rgba(255,255,255,0.03)",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 800,
      }) as React.CSSProperties,
    field: {
      display: "grid",
      gap: 8,
      marginBottom: 14,
    } as React.CSSProperties,
    label: {
      fontSize: 12,
      fontWeight: 800,
      color: "rgba(231,238,249,0.75)",
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
    button: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid rgba(59,130,246,0.35)",
      background:
        "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      marginTop: 8,
    } as React.CSSProperties,
    msg: {
      marginTop: 12,
      fontSize: 13,
      color: "rgba(231,238,249,0.7)",
      lineHeight: 1.5,
    } as React.CSSProperties,
  };

  const onSubmit = async () => {
    setLoading(true);
    setMsg("");

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (result.error) {
          setMsg(result.error.message || "Signup failed");
        } else {
          window.location.href = "/";
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setMsg(result.error.message || "Login failed");
        } else {
          window.location.href = "/";
        }
      }
    } catch (err: any) {
      setMsg(err?.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <img
              src="/Professional Emblem Logo in Blue and Silver.png"
              alt="Duble-S Motion AI"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div>
            <h1 style={styles.title}>Duble-S Motion AI</h1>
            <div style={styles.sub}>Sign in to manage your AI video workspace.</div>
          </div>
        </div>

        <div style={styles.tabs}>
          <button style={styles.tab(mode === "login")} onClick={() => setMode("login")}>
            Login
          </button>
          <button style={styles.tab(mode === "signup")} onClick={() => setMode("signup")}>
            Sign Up
          </button>
        </div>

        {mode === "signup" && (
          <div style={styles.field}>
            <div style={styles.label}>Full Name</div>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div style={styles.field}>
          <div style={styles.label}>Email</div>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <div style={styles.label}>Password</div>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button style={styles.button} onClick={onSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>

        {msg ? <div style={styles.msg}>{msg}</div> : null}
      </div>
    </div>
  );
}