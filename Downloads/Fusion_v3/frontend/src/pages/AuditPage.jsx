import { useState, useEffect, useCallback } from "react";
import { useToast } from "../utils/toast";
import { getAuditLogs, exportLogs } from "../services/api";

const EVENT_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "user_created", label: "User Created" },
  { value: "role_assigned", label: "Role Assigned" },
  { value: "user_deactivated", label: "Account Deactivated" },
  { value: "user_activated", label: "Account Activated" },
  { value: "user_archived", label: "Account Archived" },
  { value: "role_expired", label: "Role Expired" },
];

const getLogLevel = (action) => {
  if (action === "user_created" || action === "user_activated") return "success";
  if (action === "user_deactivated" || action === "user_archived" || action === "role_expired") return "warn";
  if (action === "role_revoked") return "danger";
  return "";
};

export default function AuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.action = filter;
      const data = await getAuditLogs(params);
      let results = data.results || [];

      // Client-side search
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (l) =>
            l.action?.toLowerCase().includes(q) ||
            JSON.stringify(l.details)?.toLowerCase().includes(q)
        );
      }

      setLogs(results);
    } catch (err) {
      toast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    try {
      exportLogs(logs);
      toast("Audit logs exported", "success");
    } catch (err) {
      toast("Export failed", "error");
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Audit & System Logs
      </div>

      <div className="role-section">
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1.5px solid #dde3ec",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
          >
            {EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1.5px solid #dde3ec",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              flex: 1,
              minWidth: 160,
            }}
          />

          <button className="btn btn-secondary" onClick={handleExport}>
            Export CSV
          </button>
        </div>

        {/* Log List */}
        <div>
          {loading ? (
            <div className="no-results">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="no-results">No logs found.</div>
          ) : (
            logs.map((log) => {
              const level = getLogLevel(log.action);
              const message = log.details
                ? `${log.action.replace(/_/g, " ")} — ${JSON.stringify(log.details)}`
                : log.action.replace(/_/g, " ");

              return (
                <div key={log.id} className={`log-entry log-${level}`}>
                  <b>{log.action?.toUpperCase().replace(/_/g, " ")}</b> — {message}
                  <div className="log-time">🕐 {formatTimestamp(log.timestamp)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
