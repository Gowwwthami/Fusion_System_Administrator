import { useState } from "react";
import { login } from "../services/api";

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.username, form.password);
      onLogin();
    } catch (err) {
      setError("Invalid username or password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      <div style={{ width: 400, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 28, color: "var(--amber)", letterSpacing: "-1px" }}>
            FusionERP
          </div>
          <div style={{ color: "var(--muted)", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.1em" }}>
            SYSTEM ADMINISTRATOR PORTAL
          </div>
        </div>

        <div className="card" style={{ border: "1px solid var(--border)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          IIITDM Jabalpur — Secured Server
        </div>
      </div>
    </div>
  );
}
