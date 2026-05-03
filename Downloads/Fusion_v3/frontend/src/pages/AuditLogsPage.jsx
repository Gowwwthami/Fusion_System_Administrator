import { useEffect, useMemo, useState } from "react";
import { useToast } from "../utils/toast";
import { getUsers, getAuditLogs, exportLogs } from "../services/api";

const ACTIONS = [
  "",
  "user_created",
  "user_activated",
  "user_deactivated",
  "user_archived",
  "role_assigned",
  "role_reassigned",
  "role_revoked",
  "password_reset",
  "bulk_import",
  "module_access",
];

const PAGE_SIZE = 15;

function prettyAction(action) {
  if (!action) return "Unknown";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

function detailsToText(details) {
  if (details == null) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function AuditLogsPage() {
  const toast = useToast();
  const [counts, setCounts] = useState({ total: null, students: null, faculty: null, staff: null });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  async function loadPageData() {
    setLoading(true);
    try {
      const [all, students, faculty, staff, recent, filtered] = await Promise.all([
        getUsers(),
        getUsers({ user_type: "student" }),
        getUsers({ user_type: "faculty" }),
        getUsers({ user_type: "staff" }),
        getAuditLogs({ page_size: 5 }),
        getAuditLogs(action ? { action } : {}),
      ]);

      setCounts({
        total: all.count,
        students: students.count,
        faculty: faculty.count,
        staff: staff.count,
      });
      setRecentLogs(recent.results || []);
      setLogs(Array.isArray(filtered) ? filtered : (filtered?.results || []));
    } catch (err) {
      toast("Failed to fetch audit logs.", "error");
      setLogs([]);
      setRecentLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, [action]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((log) => {
      const actionText = String(log?.action || "").toLowerCase();
      const actorText = String(log?.performed_by || "").toLowerCase();
      const targetText = String(log?.target_user || "").toLowerCase();
      const detailsText = detailsToText(log?.details).toLowerCase();
      return (
        actionText.includes(q)
        || actorText.includes(q)
        || targetText.includes(q)
        || detailsText.includes(q)
      );
    });
  }, [logs, query]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const visible = filteredLogs.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, action]);

  function handleExport() {
    if (!filteredLogs.length) {
      toast("No logs to export.", "info");
      return;
    }
    exportLogs(filteredLogs);
    toast("Audit logs exported.", "success");
  }

  const statCards = [
    { label: "Total Users", value: counts.total, color: "var(--text)" },
    { label: "Students", value: counts.students, color: "var(--blue)" },
    { label: "Faculty", value: counts.faculty, color: "var(--amber)" },
    { label: "Staff", value: counts.staff, color: "var(--green)" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Admin Activity Logs
      </div>

      <div className="grid-3 mb-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {card.label}
            </div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          Recent Activity
        </div>
        {recentLogs.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No recent activity.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recentLogs.map((log) => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: log.action === "user_created" ? "var(--green)" : "var(--muted)",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{prettyAction(log.action)}</span>
                  {log.target_user && <span style={{ color: "var(--muted)", marginLeft: 6 }}>→ {log.target_user}</span>}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                  {formatTime(log.timestamp)}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>
                  by @{log.performed_by || "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="role-section">
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
          Shows every action performed by admin accounts, grouped by the admin username that triggered the change.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1.5px solid #dde3ec",
              borderRadius: 8,
              fontSize: 13,
              minWidth: 200,
            }}
          >
            {ACTIONS.map((a) => (
              <option key={a || "all"} value={a}>
                {a ? prettyAction(a) : "All Actions"}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, actor, target, details"
            style={{
              padding: "8px 12px",
              border: "1.5px solid #dde3ec",
              borderRadius: 8,
              fontSize: 13,
              flex: 1,
              minWidth: 220,
            }}
          />

          <button className="btn btn-secondary" onClick={loadPageData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            Export CSV
          </button>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #e5e9f2", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
            <thead>
              <tr style={{ background: "#f6f8fc", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Time</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Action</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Admin Username</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Target</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>IP</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    No logs found.
                  </td>
                </tr>
              ) : (
                visible.map((log) => (
                  <tr key={log.id} style={{ borderTop: "1px solid #eef2f8", verticalAlign: "top" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#5b6780", whiteSpace: "nowrap" }}>
                      {formatTime(log.timestamp)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700 }}>
                      {prettyAction(log.action)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "var(--blue-dark)" }}>
                      @{log.performed_by || "-"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{log.target_user || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{log.ip_address || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, maxWidth: 360, wordBreak: "break-word" }}>
                      {detailsToText(log.details) || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#72809a" }}>
            Showing {visible.length} of {filteredLogs.length} logs
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
            >
              Prev
            </button>
            <span style={{ fontSize: 12, color: "#44516a", alignSelf: "center" }}>
              Page {pageSafe} / {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
