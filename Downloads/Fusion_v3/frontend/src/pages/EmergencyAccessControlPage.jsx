import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../utils/toast";
import {
  getUsers,
  getDesignations,
  getRoleAssignments,
  getAuditLogs,
  getEmergencyAccesses,
  requestEmergencyAccess,
  approveEmergencyAccess,
  declineEmergencyAccess,
  grantEmergencyAccess,
  revokeEmergencyAccess,
} from "../services/api";

function formatTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

function toInputDateTime(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toISOString().slice(0, 16);
}

function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function EmergencyAccessControlPage() {
  const toast = useToast();
  const notifyAdminUpdate = (message = "Update completed successfully") => {
    toast(message, "success");
  };

  const [form, setForm] = useState({
    username: "",
    role_id: "",
    justification: "",
    start_at: "",
    end_at: "",
    decision_note: "",
  });

  const [accesses, setAccesses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accessRes, auditRes] = await Promise.all([
        getEmergencyAccesses(),
        getAuditLogs({ page_size: 100 }),
      ]);
      setAccesses(Array.isArray(accessRes) ? accessRes : []);
      setAuditLogs(Array.isArray(auditRes?.results) ? auditRes.results : []);
    } catch (err) {
      toast("Failed to load emergency access data.", "error");
      setAccesses([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [usersRes, designationRes, assignmentRes] = await Promise.all([
        getUsers({ page_size: 200 }),
        getDesignations(),
        getRoleAssignments({ page_size: 500 }),
      ]);

      setDirectoryUsers(Array.isArray(usersRes?.results) ? usersRes.results : []);
      setDesignations(Array.isArray(designationRes) ? designationRes : []);
      setRoleAssignments(Array.isArray(assignmentRes?.results) ? assignmentRes.results : []);
    } catch {
      toast("Failed to load dropdown options for emergency access.", "error");
      setDirectoryUsers([]);
      setDesignations([]);
      setRoleAssignments([]);
    }
  }, [toast]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const assigneeOptions = useMemo(() => (
    directoryUsers
      .filter((entry) => entry?.user_type === "faculty" || entry?.user_type === "staff")
      .map((entry) => {
        const username = entry?.user?.username || "";
        const firstName = entry?.user?.first_name || "";
        const lastName = entry?.user?.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || username;
        return {
          id: entry?.user?.id,
          username,
          fullName,
          label: `${fullName} (${username})`,
        };
      })
      .filter((item) => item.id && item.username)
  ), [directoryUsers]);

  const designationOptions = useMemo(() => (
    [
      ...designations
        .filter((d) => d?.is_active !== false)
        .map((d) => ({ id: d?.id, name: d?.name }))
        .filter((d) => d.id && d.name),
      { id: "super_admin", name: "Super Admin" },
    ]
  ), [designations]);

  const emergencyActivityLogs = useMemo(() => {
    const emergencyUsers = new Set(accesses.map((a) => a.user).filter(Boolean));
    return auditLogs.filter((log) => {
      const actor = log?.performed_by;
      const target = log?.target_user;
      return (
        log?.action === "emergency_access"
        || emergencyUsers.has(actor)
        || emergencyUsers.has(target)
      );
    });
  }, [accesses, auditLogs]);

  async function handleGrantAccess(e) {
    e.preventDefault();

    if (!form.username || !form.role_id || !form.justification.trim() || !form.end_at) {
      toast("Please fill all required fields.", "error");
      return;
    }

    const startAt = form.start_at || null;
    const endAt = form.end_at;

    setGranting(true);
    try {
      const selectedUser = assigneeOptions.find((entry) => entry.username === form.username);
      if (!selectedUser?.id) {
        toast("Select a valid user from the assignee dropdown.", "error");
        return;
      }

      await requestEmergencyAccess({
        user_id: selectedUser.id,
        role_id: form.role_id,
        start_at: startAt,
        end_at: endAt,
        justification: form.justification.trim(),
      });

      notifyAdminUpdate("Emergency access request submitted.");
      setForm((prev) => ({
        ...prev,
        username: "",
        role_id: "",
        justification: "",
        start_at: "",
        end_at: "",
        decision_note: "",
      }));
      loadData();
    } catch (err) {
      const msg = err?.data?.error || "Failed to submit emergency access request.";
      toast(msg, "error");
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(accessId) {
    try {
      await revokeEmergencyAccess(accessId);
      notifyAdminUpdate("Emergency access revoked successfully.");
      loadData();
    } catch (err) {
      const msg = err?.data?.error || "Failed to revoke emergency access.";
      toast(msg, "error");
    }
  }

  async function handleApprove(access) {
    const draft = pendingEdits[access.id] || {};
    const roleId = draft.role_id || access.requested_role_id || access.approved_role_id || form.role_id;
    const startAt = draft.start_at || access.requested_start || null;
    const endAt = draft.end_at || access.requested_end || null;
    const note = draft.decision_note || "";

    if (!roleId || !endAt) {
      toast("Role and end time are required to approve.", "error");
      return;
    }

    try {
      await approveEmergencyAccess(access.id, {
        role_id: roleId,
        start_at: startAt,
        end_at: endAt,
        decision_note: note,
      });
      notifyAdminUpdate("Emergency access approved.");
      setPendingEdits((prev) => ({ ...prev, [access.id]: {} }));
      loadData();
    } catch (err) {
      const msg = err?.data?.error || "Failed to approve request.";
      toast(msg, "error");
    }
  }

  async function handleDecline(access) {
    const draft = pendingEdits[access.id] || {};
    const note = draft.decision_note || "";
    try {
      await declineEmergencyAccess(access.id, { decision_note: note });
      notifyAdminUpdate("Emergency access declined.");
      setPendingEdits((prev) => ({ ...prev, [access.id]: {} }));
      loadData();
    } catch (err) {
      const msg = err?.data?.error || "Failed to decline request.";
      toast(msg, "error");
    }
  }

  const activeCount = accesses.filter((a) => a.is_active).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Emergency Access Control
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="num">{accesses.length}</div>
          <div className="lbl">Total Emergency Sessions</div>
        </div>
        <div className="stat-card">
          <div className="num">{activeCount}</div>
          <div className="lbl">Active Emergency Access</div>
        </div>
      </div>

      <div className="role-section" style={{ marginBottom: 16 }}>
        <h2>Emergency Access Requests</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          Submit a request for temporary role access. Admins can approve, decline, or edit the timeline.
        </p>

        <form onSubmit={handleGrantAccess} style={{ display: "grid", gap: 10 }}>
          <select
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            style={{ padding: "10px 12px", border: "1.5px solid #dde3ec", borderRadius: 8 }}
          >
            <option value="">Select assignee (faculty/staff)</option>
            {assigneeOptions.map((option) => (
              <option key={option.id} value={option.username}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={form.role_id}
            onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))}
            style={{ padding: "10px 12px", border: "1.5px solid #dde3ec", borderRadius: 8 }}
          >
            <option value="">Select requested role</option>
            {designationOptions.map((designation) => (
              <option key={designation.id} value={designation.id}>
                {designation.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
            style={{ padding: "10px 12px", border: "1.5px solid #dde3ec", borderRadius: 8 }}
          />
          <input
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
            style={{ padding: "10px 12px", border: "1.5px solid #dde3ec", borderRadius: 8 }}
          />
          <textarea
            rows={3}
            placeholder="Emergency justification"
            value={form.justification}
            onChange={(e) => setForm((prev) => ({ ...prev, justification: e.target.value }))}
            style={{ padding: "10px 12px", border: "1.5px solid #dde3ec", borderRadius: 8, resize: "vertical" }}
          />

          <div>
            <button className="btn btn-danger" type="submit" disabled={granting}>
              {granting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>

      <div className="role-section" style={{ marginBottom: 16 }}>
        <h2>Emergency Access Sessions</h2>
        <div style={{ overflowX: "auto", border: "1px solid #e5e9f2", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#f6f8fc", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Requester</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Assignee</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Role</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Window</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Status</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Approver</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Decision</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Justification</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    Loading emergency access sessions...
                  </td>
                </tr>
              ) : accesses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    No emergency access sessions found.
                  </td>
                </tr>
              ) : (
                accesses.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eef2f8", verticalAlign: "top" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.requested_by || "-"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700 }}>{item.user}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.status === "pending" ? (
                        <select
                          value={pendingEdits[item.id]?.role_id || item.requested_role_id || ""}
                          onChange={(e) =>
                            setPendingEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], role_id: e.target.value },
                            }))
                          }
                          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d9e2ef" }}
                        >
                          <option value="">Select role</option>
                          {designationOptions.map((designation) => (
                            <option key={designation.id} value={designation.id}>
                              {designation.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.approved_role || item.requested_role || "-"
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, whiteSpace: "nowrap" }}>
                      {item.status === "pending" ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <input
                            type="datetime-local"
                            value={pendingEdits[item.id]?.start_at || toInputDateTime(item.requested_start) || ""}
                            onChange={(e) =>
                              setPendingEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], start_at: e.target.value },
                              }))
                            }
                            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d9e2ef" }}
                          />
                          <input
                            type="datetime-local"
                            value={pendingEdits[item.id]?.end_at || toInputDateTime(item.requested_end) || ""}
                            onChange={(e) =>
                              setPendingEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], end_at: e.target.value },
                              }))
                            }
                            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d9e2ef" }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div>{formatTime(item.approved_start || item.requested_start)}</div>
                          <div>{formatTime(item.approved_end || item.requested_end)}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.status || (item.is_active ? "approved" : "revoked")}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.approver_name || item.granted_by || "-"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.status === "pending" ? (
                        <textarea
                          rows={2}
                          value={pendingEdits[item.id]?.decision_note || ""}
                          onChange={(e) =>
                            setPendingEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], decision_note: e.target.value },
                            }))
                          }
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d9e2ef" }}
                        />
                      ) : (
                        item.decision_note || "-"
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, maxWidth: 260, wordBreak: "break-word" }}>
                      {item.justification || "-"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>
                      {item.status === "pending" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleApprove(item)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#c62828" }}
                            onClick={() => handleDecline(item)}
                          >
                            Decline
                          </button>
                        </div>
                      ) : item.is_active ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#c62828" }}
                          onClick={() => handleRevoke(item.id)}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span style={{ color: "#72809a" }}>{item.revoked_at ? "Revoked" : "Expired"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="role-section">
        <h2>Emergency Activity Logs</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          This includes emergency grants and actions performed by users who received emergency module control.
        </p>
        <div style={{ overflowX: "auto", border: "1px solid #e5e9f2", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f6f8fc", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Time</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Action</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Performed By</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Target User</th>
                <th style={{ padding: "10px 12px", fontSize: 12 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    Loading emergency activity logs...
                  </td>
                </tr>
              ) : emergencyActivityLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: "#72809a", fontSize: 13 }}>
                    No emergency activity logs found.
                  </td>
                </tr>
              ) : (
                emergencyActivityLogs.map((log) => (
                  <tr key={log.id} style={{ borderTop: "1px solid #eef2f8", verticalAlign: "top" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, whiteSpace: "nowrap" }}>{formatTime(log.timestamp)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700 }}>{log.action}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{log.performed_by || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12 }}>{log.target_user || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, maxWidth: 320, wordBreak: "break-word" }}>
                      {toText(log.details) || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}