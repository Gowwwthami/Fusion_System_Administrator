import { useState, useEffect, useCallback } from "react";
import { getUsers, exportUsers, importUsers } from "../services/api";
import AddUserModal from "../components/users/AddUserModal";
import UserActionsMenu from "../components/users/UserActionsMenu";
import { useToast } from "../utils/toast";

const TYPE_FILTERS = ["all", "student", "faculty", "staff"];

function Badge({ value }) {
  const cls = { active: "badge-active", inactive: "badge-inactive", archived: "badge-archived",
    student: "badge-student", faculty: "badge-faculty", staff: "badge-staff" };
  return <span className={`badge ${cls[value] || ""}`}>{value}</span>;
}

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [importRef, setImportRef] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (typeFilter !== "all") params.user_type = typeFilter;
      if (search) params.q = search;
      const res = await getUsers(params);
      setUsers(res.results || []);
      setCount(res.count || 0);
    } catch { toast("Failed to load users.", "error"); }
    finally { setLoading(false); }
  }, [page, typeFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleSearchKey(e) {
    if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importUsers(file, typeFilter !== "all" ? typeFilter : "student");
      toast(`User import completed successfully: ${result.results.created.length} created, ${result.results.failed.length} failed.`, "success");
      fetchUsers();
    } catch { toast("Import failed.", "error"); }
    e.target.value = "";
  }

  const totalPages = Math.ceil(count / 20);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>User Management</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{count} total users</p>
        </div>
        <div className="flex gap-2">
          <input ref={r => setImportRef(r)} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
          <button className="btn btn-secondary btn-sm" onClick={() => importRef?.click()}>↑ Import CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportUsers(typeFilter !== "all" ? typeFilter : undefined)}>↓ Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add User</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4" style={{ flexWrap: "wrap" }}>
        <div className="tabs">
          {TYPE_FILTERS.map(t => (
            <button key={t} className={`tab ${typeFilter === t ? "active" : ""}`} onClick={() => { setTypeFilter(t); setPage(1); }} style={{ textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>
        <input
          className="form-input"
          placeholder="Search by name, username, email…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKey}
          style={{ maxWidth: 280 }}
        />
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            Clear ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Department</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.user.id}>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{u.user.username}</span></td>
                  <td style={{ fontWeight: 500 }}>{u.user.first_name} {u.user.last_name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.user.email}</td>
                  <td><Badge value={u.user_type} /></td>
                  <td><Badge value={u.user_status} /></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.department?.name || "—"}</td>
                  <td><UserActionsMenu user={u} onRefresh={fetchUsers} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={fetchUsers} />}
    </div>
  );
}
