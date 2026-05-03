import { useState, useEffect } from "react";
import { getUsers, getAuditLogs } from "../services/api";

function StatCard({ label, value, icon, sub }) {
  return (
    <article className="fusion-stat-card">
      <div className="fusion-stat-head">
        <p>{label}</p>
        <span>{icon}</span>
      </div>
      <h3>{value ?? "-"}</h3>
      <span className="fusion-muted">{sub}</span>
    </article>
  );
}

function ActionCard({ title, text, onClick }) {
  return (
    <article className="fusion-action-card">
      <h4>{title}</h4>
      <p>{text}</p>
      <button onClick={onClick}>Open</button>
    </article>
  );
}

function iconForAction(action = "") {
  const key = String(action).toLowerCase();
  if (key.includes("create")) return "●";
  if (key.includes("archive")) return "◼";
  if (key.includes("role")) return "◆";
  if (key.includes("password")) return "◉";
  return "•";
}

function formatAction(action = "") {
  return String(action).replace(/_/g, " ");
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function since(ts) {
  const t = new Date(ts).getTime();
  if (!t) return "just now";
  const mins = Math.max(1, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hrs ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function DashboardTable({ logs }) {
  return (
    <article className="fusion-panel">
      <header className="fusion-panel-head">
        <h5>Recent User Operations</h5>
      </header>
      <div className="fusion-table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).slice(0, 6).map((log) => (
              <tr key={log.id}>
                <td>{log.target_user || "system"}</td>
                <td>{formatAction(log.action)}</td>
                <td>{since(log.timestamp)}</td>
                <td>
                  <span className="fusion-badge ok">Completed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function NotificationPanel({ logs }) {
  return (
    <article className="fusion-panel">
      <header className="fusion-panel-head">
        <h5>Notifications</h5>
      </header>
      <ul className="fusion-feed-list">
        {(logs || []).slice(0, 5).map((log) => (
          <li key={`feed-${log.id}`}>
            <i>{iconForAction(log.action)}</i>
            <div>
              <strong>{formatAction(log.action)}</strong>
              <p>{log.target_user ? `Target: ${log.target_user}` : "System action"}</p>
              <small>{formatTime(log.timestamp)}</small>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function DashboardPage({ onNavigate }) {
  const [counts, setCounts] = useState({ total: null, students: null, faculty: null, staff: null, roles: 573 });
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [all, students, faculty, staff, logs] = await Promise.all([
          getUsers(),
          getUsers({ user_type: "student" }),
          getUsers({ user_type: "faculty" }),
          getUsers({ user_type: "staff" }),
          getAuditLogs({ page_size: 12 }),
        ]);
        setCounts({
          total: all.count,
          students: students.count,
          faculty: faculty.count,
          staff: staff.count,
          roles: Math.max(1, Math.floor((faculty.count || 0) + (staff.count || 0) / 2)),
        });
        setRecentLogs(logs.results || []);
      } catch {
        setRecentLogs([]);
      }
    }
    load();
  }, []);

  return (
    <div className="fusion-dashboard-page">
      <div className="fusion-title-wrap">
        <button className="fusion-title-btn">Fusion System Administrator</button>
      </div>

      <section className="fusion-stats-grid">
        <StatCard label="Total Users" value={counts.total} icon="👤" sub="In last year" />
        <StatCard label="Total Roles" value={counts.roles} icon="🛡" sub="In last year" />
        <StatCard label="Created Roles" value={counts.faculty || 0} icon="⚙" sub="In last year" />
        <StatCard label="Archived Users" value={counts.staff || 0} icon="🗃" sub="In last year" />
      </section>

      <section className="fusion-quick-actions">
        <ActionCard
          title="Manage Users"
          text="Create user, reset credentials and maintain the user directory."
          onClick={() => onNavigate?.("user-directory")}
        />
        <ActionCard
          title="Role Management"
          text="Create role, modify permissions and update role assignment."
          onClick={() => onNavigate?.("role-management")}
        />
        <ActionCard
          title="Audit Logs"
          text="Monitor admin actions and review security-sensitive changes."
          onClick={() => onNavigate?.("audit-logs")}
        />
      </section>

      <section className="fusion-dashboard-grid">
        <DashboardTable logs={recentLogs} />
        <NotificationPanel logs={recentLogs} />
      </section>
    </div>
  );
}
