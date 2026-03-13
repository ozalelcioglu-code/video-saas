"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { useLanguage } from "../../provider/LanguageProvider";
import { useSession } from "../../provider/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { refreshSession } = useSession();

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
          router.replace("/");
          router.refresh();
        }
      } catch (error) {
        console.error(error);
      }
    };

    check();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setMsg(result.error.message || t.auth.signupFailed);
        } else {
          await refreshSession();
          router.push("/");
          router.refresh();
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setMsg(result.error.message || t.auth.loginFailed);
        } else {
          await refreshSession();
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      setMsg(err?.message || t.auth.authFailed);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      background:
        "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(900px 450px at 90% 0%, rgba(139,92,246,0.12), transparent 45%), #06101d",
      color: "#e7eef9",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    } as React.CSSProperties,
    hero: {
      padding: "48px 42px",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      gap: 24,
      borderRight: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    heroLogo: {
      display: "flex",
      alignItems: "center",
      gap: 14,
    } as React.CSSProperties,
    logo: {
      width: 64,
      height: 64,
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    heroTitle: {
      fontSize: 46,
      fontWeight: 950,
      lineHeight: 1.06,
      letterSpacing: -1.2,
      margin: 0,
      maxWidth: 620,
    } as React.CSSProperties,
    heroText: {
      fontSize: 15,
      lineHeight: 1.7,
      color: "rgba(231,238,249,0.72)",
      maxWidth: 620,
    } as React.CSSProperties,
    featureList: {
      display: "grid",
      gap: 12,
      maxWidth: 560,
    } as React.CSSProperties,
    featureItem: {
      padding: "14px 16px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#dce8f8",
      fontWeight: 700,
    } as React.CSSProperties,
    authWrap: {
      padding: 24,
      display: "grid",
      placeItems: "center",
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
    cardTitle: {
      fontSize: 28,
      fontWeight: 900,
      margin: 0,
    } as React.CSSProperties,
    sub: {
      marginTop: 8,
      color: "rgba(231,238,249,0.65)",
      fontSize: 14,
      lineHeight: 1.6,
    } as React.CSSProperties,
    tabs: {
      display: "flex",
      gap: 10,
      marginTop: 20,
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
      textTransform: "uppercase" as const,
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
      color: "#ffcccc",
      lineHeight: 1.5,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroLogo}>
          <div style={styles.logo}>
            <img
              src="/Professional Emblem Logo in Blue and Silver.png"
              alt="Duble-S Motion AI"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Duble-S Motion AI</div>
            <div style={{ color: "rgba(231,238,249,0.62)", marginTop: 4 }}>
              {t.header.workspace}
            </div>
          </div>
        </div>

        <h1 style={styles.heroTitle}>{t.auth.title}</h1>
        <div style={styles.heroText}>{t.auth.description}</div>

        <div style={styles.featureList}>
          <div style={styles.featureItem}>{t.auth.feature1}</div>
          <div style={styles.featureItem}>{t.auth.feature2}</div>
          <div style={styles.featureItem}>{t.auth.feature3}</div>
        </div>
      </section>

      <section style={styles.authWrap}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            {mode === "login" ? t.auth.welcomeBack : t.auth.createNewAccount}
          </h2>
          <div style={styles.sub}>{t.auth.subtitle}</div>

          <div style={styles.tabs}>
            <button type="button" style={styles.tab(mode === "login")} onClick={() => setMode("login")}>
              {t.common.login}
            </button>

            <button type="button" style={styles.tab(mode === "signup")} onClick={() => setMode("signup")}>
              {t.common.signup}
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {mode === "signup" && (
              <div style={styles.field}>
                <div style={styles.label}>{t.auth.fullName}</div>
                <input
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div style={styles.field}>
              <div style={styles.label}>{t.auth.email}</div>
              <input
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>{t.auth.password}</div>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            <button style={styles.button} type="submit" disabled={loading}>
              {loading
                ? t.auth.pleaseWait
                : mode === "login"
                ? t.common.login
                : t.auth.createAccount}
            </button>
          </form>

          {msg ? <div style={styles.msg}>{msg}</div> : null}
        </div>
      </section>
    </div>
  );
}