import { useState, useEffect, useCallback } from "react";
import { useToast } from "../utils/toast";
import { getStats, getUsers, activateUser, deactivateUser, archiveUser } from "../services/api";

export default function RBACPage() {
  const toast = useToast();
  const notifyAdminUpdate = (message = "Update completed successfully") => {
    toast(message, "success");
  };
  const [stats, setStats] = useState({
    total_users: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([getStats(), getUsers()]);
      setStats(statsRes);
      setUsers(usersRes.results || []);
    } catch (err) {
      toast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.user?.username?.toLowerCase().includes(q) ||
      u.user?.first_name?.toLowerCase().includes(q) ||
      u.user?.last_name?.toLowerCase().includes(q)
    );
  });

  const handleActivate = async (username) => {
    try {
      await activateUser(username);
      notifyAdminUpdate("Account activated successfully.");
      fetchData();
    } catch (err) {
      toast("Failed to activate", "error");
    }
  };

  const handleDeactivate = async (username) => {
    try {
      await deactivateUser(username);
      notifyAdminUpdate("Account deactivated successfully.");
      fetchData();
    } catch (err) {
      toast("Failed to deactivate", "error");
    }
  };

  const handleArchive = async (username, name) => {
    if (!confirm(`Archive "${name}"? They will lose login access but historical data will be retained for auditing.`)) {
      return;
    }
    try {
      await archiveUser(username);
      notifyAdminUpdate(`${name} account archived successfully.`);
      fetchData();
    } catch (err) {
      toast("Failed to archive", "error");
    }
  };

  const getStatusDot = (status) => {
    if (status === "active") return <span className="status-dot dot-green"></span>;
    if (status === "archived") return <span className="status-dot dot-red"></span>;
    return <span className="status-dot dot-orange"></span>;
  };

  const getTypeBadge = (type) => {
    return <span className="badge badge-blue">{type}</span>;
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        RBAC – Access Control
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="num">{stats.total_users}</div>
          <div className="lbl">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.active}</div>
          <div className="lbl">Active</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.inactive}</div>
          <div className="lbl">Inactive</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.archived}</div>
          <div className="lbl">Archived</div>
        </div>
      </div>

      {/* User Status Management */}
      <div className="role-section">
        <h2>User Account Status</h2>
        <div className="search-wrap" style={{ marginBottom: 12 }}>
          <span className="ico">🔍</span>
          <input
            type="text"
            placeholder="Search user to manage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="role-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>
                  Loading...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.slice(0, 20).map((u) => {
                const fullName = `${u.user?.first_name || ""} ${u.user?.last_name || ""}`.trim();
                return (
                  <tr key={u.user?.id}>
                    <td>
                      <b>{fullName}</b>
                    </td>
                    <td>{u.user?.username}</td>
                    <td>{getTypeBadge(u.user_type)}</td>
                    <td>
                      {getStatusDot(u.user_status)}
                      {u.user_status}
                    </td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.user_status !== "active" && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleActivate(u.user?.username)}
                        >
                          Activate
                        </button>
                      )}
                      {u.user_status === "active" && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#e65100" }}
                          onClick={() => handleDeactivate(u.user?.username)}
                        >
                          Deactivate
                        </button>
                      )}
                      {u.user_status !== "archived" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleArchive(u.user?.username, fullName)}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
