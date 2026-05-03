import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../utils/toast";
import {
  getUsers,
  getDesignations,
  getRoleAssignments,
  assignRole,
  revokeRole,
  getModuleAccess,
  getAssignableRoles,
  getSystemRoles,
  getAvailablePermissionModules,
  createSystemRole,
  modifySystemRole,
  deactivateSystemRole,
} from "../services/api";

export default function RolesPage() {
  const toast = useToast();
  const notifyAdminUpdate = (message = "Update completed successfully") => {
    toast(message, "success");
  };
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [moduleAccess, setModuleAccess] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [assignableRoles, setAssignableRoles] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] });
  const [savingRole, setSavingRole] = useState(false);
  const hasLoadedRefs = useRef(false);

  // Assign form state
  const [assignForm, setAssignForm] = useState({
    username: "",
    designation: "",
    start_date: "",
    end_date: "",
  });

  // Conflict modal state
  const [conflict, setConflict] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, assignmentsRes, desigsRes] = await Promise.all([
        getUsers(),
        getRoleAssignments(),
        getDesignations(),
      ]);

      const [rolesRes, modulesRes] = await Promise.all([
        getSystemRoles().catch(() => []),
        getAvailablePermissionModules().catch(() => []),
      ]);
      
      setUsers(usersRes.results || []);
      setAssignments(assignmentsRes.results || []);
      setDesignations(desigsRes || []);
      setSystemRoles(Array.isArray(rolesRes) ? rolesRes : []);
      setPermissionModules(Array.isArray(modulesRes) ? modulesRes : []);
    } catch (err) {
      toast("Failed to load data. Make sure backend is running.", "error");
    }
  }, [toast]);

  useEffect(() => {
    if (hasLoadedRefs.current) return;
    hasLoadedRefs.current = true;

    fetchData();
    // Set today's date as default start date
    const today = new Date().toISOString().split("T")[0];
    setAssignForm((prev) => ({ ...prev, start_date: today }));
  }, [fetchData]);

  const fetchAssignableRoles = async (username) => {
    if (!username) {
      setAssignableRoles(null);
      return;
    }

    try {
      const data = await getAssignableRoles(username);
      setAssignableRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssignableRoles([]);
      toast(err?.data?.error || 'Failed to load eligible roles', 'error');
    }
  };

  const fetchModuleAccess = async () => {
    if (!selectedRole) {
      toast("Please select a role", "error");
      return;
    }

    try {
      const data = await getModuleAccess(selectedRole);
      setModuleAccess(data || []);
      
      if (data && data.length > 0) {
        toast(`Loaded ${data.length} module permissions for "${selectedRole}"`, "success");
      } else {
        toast(`No module permissions found for "${selectedRole}"`, "error");
      }
    } catch (err) {
      toast(err?.data?.error || "Failed to load module access", "error");
    }
  };

  const buildPermissionRows = (sourceRole = null) => {
    const sourcePermissions = sourceRole?.permissions || [];
    return permissionModules.map((module) => {
      const existing = sourcePermissions.find((item) => item.module === module.module) || module;
      return {
        module: module.module,
        view: !!existing.view,
        create: !!existing.create,
        edit: !!existing.edit,
        delete: !!existing.delete,
      };
    });
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: buildPermissionRows() });
    setShowRoleModal(true);
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: buildPermissionRows(role),
    });
    setShowRoleModal(true);
  };

  const toggleRolePermission = (index, key) => {
    setRoleForm((prev) => {
      const permissions = [...prev.permissions];
      permissions[index] = { ...permissions[index], [key]: !permissions[index][key] };
      return { ...prev, permissions };
    });
  };

  const saveRole = async () => {
    const selectedPermissions = roleForm.permissions.filter(
      (permission) => permission.view || permission.create || permission.edit || permission.delete
    );

    if (!roleForm.name.trim()) {
      toast("Role name is required", "error");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast("Select at least one permission", "error");
      return;
    }

    setSavingRole(true);
    try {
      const payload = {
        name: roleForm.name.trim(),
        description: roleForm.description,
        permissions: selectedPermissions,
      };
      if (editingRole) {
        await modifySystemRole(editingRole.id, payload);
        notifyAdminUpdate("Role updated successfully");
      } else {
        await createSystemRole(payload);
        notifyAdminUpdate("Role created successfully");
      }
      setShowRoleModal(false);
      setEditingRole(null);
      fetchData();
    } catch (err) {
      toast(err?.data?.error || "Failed to save role", "error");
    } finally {
      setSavingRole(false);
    }
  };

  const deactivateRole = async (role) => {
    if (!confirm(`Deactivate role \"${role.name}\"?`)) return;
    try {
      await deactivateSystemRole(role.id);
      notifyAdminUpdate("Role deactivated successfully");
      fetchData();
    } catch (err) {
      toast(err?.data?.error || "Failed to deactivate role", "error");
    }
  };

  const togglePermission = (index, key) => {
    setModuleAccess((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: !next[index][key] };
      return next;
    });
  };

  const saveModuleAccess = async () => {
    if (!selectedRole) {
      toast("Please select a role", "error");
      return;
    }
    const role = designations.find((d) => d.name === selectedRole);
    if (!role) {
      toast("Selected role not found", "error");
      return;
    }

    setSavingAccess(true);
    try {
      await modifySystemRole(role.id, { permissions: moduleAccess });
      notifyAdminUpdate("Role access updated successfully");
    } catch (err) {
      toast(err?.data?.error || "Failed to update module access", "error");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleAssign = async (force = false) => {
    const { username, designation, start_date, end_date } = assignForm;

    if (!username || !designation || !start_date || !end_date) {
      const missing = [];
      if (!username) missing.push('User');
      if (!designation) missing.push('Role');
      if (!start_date) missing.push('Start Date');
      if (!end_date) missing.push('End Date');
      toast(`Please fill all fields: ${missing.join(', ')}`, "error");
      return;
    }

    try {
      const designationObj = designations.find((d) => d.name === designation);

      if (!designationObj) {
        toast(`Designation "${designation}" not found. Please select a valid role.`, "error");
        return;
      }

      const payload = {
        username,
        designation_id: designationObj.id,
        start_date,
        end_date,
        force,
      };

      const result = await assignRole(payload);

      if (result.error === "Exclusivity Conflict" && !force) {
        setConflict(result.conflict);
        return;
      }

      notifyAdminUpdate(`Role "${designation}" assigned successfully`);
      setAssignForm({ username: "", designation: "", start_date: "", end_date: "" });
      setConflict(null);
      fetchData();
    } catch (err) {
      let errorMessage = "Failed to assign role";
      if (err?.data?.error) {
        if (typeof err.data.error === 'object') {
          errorMessage = Object.entries(err.data.error)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
        } else {
          errorMessage = err.data.error;
        }
      }
      
      toast(errorMessage, "error");
    }
  };

  const handleRevoke = async (holdId) => {
    if (!confirm("Are you sure you want to revoke this role?")) return;

    try {
      await revokeRole(holdId);
      notifyAdminUpdate("Role revoked successfully");
      fetchData();
    } catch (err) {
      toast(err?.data?.error || "Failed to revoke role", "error");
    }
  };

  const getStatusDot = (status) => {
    if (status === "active") return <span className="status-dot dot-green"></span>;
    if (status === "expired") return <span className="status-dot dot-red"></span>;
    return <span className="status-dot dot-orange"></span>;
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 0" }}>
      <div className="page-header" style={{ margin: "0 0 24px" }}>
        Role Management
      </div>

      {/* Assign / Reassign Role */}
      <div className="role-section">
        <h2>Assign / Reassign Role</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Select User<span className="req">*</span></label>
            <select
              value={assignForm.username}
              onChange={(e) => {
                const nextUsername = e.target.value;
                setAssignForm({ ...assignForm, username: nextUsername, designation: "" });
                setAssignableRoles(null);
                fetchAssignableRoles(nextUsername);
              }}
            >
              <option value="">-- Select user --</option>
              {users
                .filter((u) => u.user_type !== "student")
                .map((u) => (
                  <option key={u.user.id} value={u.user.username}>
                    {u.user.first_name} {u.user.last_name} ({u.user.username})
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label>Assign Role<span className="req">*</span></label>
            <select
              value={assignForm.designation}
              onChange={(e) => setAssignForm({ ...assignForm, designation: e.target.value })}
              disabled={!assignForm.username}
            >
              <option value="">-- Select role --</option>
              {(assignableRoles === null ? designations : assignableRoles).map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date<span className="req">*</span></label>
            <input
              type="date"
              value={assignForm.start_date}
              onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>End Date<span className="req">*</span></label>
            <input
              type="date"
              value={assignForm.end_date}
              onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
            />
          </div>
        </div>
        <div className="form-actions" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary" onClick={() => handleAssign(false)}>
            Assign Role
          </button>
        </div>
      </div>

      {/* Manage Role Access */}
      <div className="role-section">
        <h2>Manage Role Access</h2>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>Select Role<span className="req">*</span></label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ maxWidth: 400 }}
          >
            <option value="">Choose a role</option>
            {designations.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-full" onClick={fetchModuleAccess}>
          Fetch module access information
        </button>

        {moduleAccess.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <table className="role-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {moduleAccess.map((perm, idx) => (
                  <tr key={idx}>
                    <td>{perm.module}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!perm.view}
                        onChange={() => togglePermission(idx, "view")}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!perm.create}
                        onChange={() => togglePermission(idx, "create")}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!perm.edit}
                        onChange={() => togglePermission(idx, "edit")}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!perm.delete}
                        onChange={() => togglePermission(idx, "delete")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
              <button className="btn btn-primary" onClick={saveModuleAccess} disabled={savingAccess}>
                {savingAccess ? "Saving..." : "Save Role Access"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System Roles */}
      <div className="role-section">
        <h2>System Roles</h2>
        <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
          <button className="btn btn-primary" onClick={openCreateRole}>
            Create Role
          </button>
        </div>
        <table className="role-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {systemRoles.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>
                  No roles found.
                </td>
              </tr>
            ) : (
              systemRoles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.description || "—"}</td>
                  <td>{role.is_active ? "Active" : "Inactive"}</td>
                  <td>{role.permissions?.length || 0}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditRole(role)}>
                        Edit
                      </button>
                      {role.is_active && role.name !== "Super Admin" && (
                        <button className="btn btn-danger btn-sm" onClick={() => deactivateRole(role)}>
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Current Role Assignments */}
      <div className="role-section">
        <h2>Current Role Assignments</h2>
        <table className="role-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>
                  No role assignments.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.user_name}</td>
                  <td>
                    <span className="chip">{a.role}</span>
                  </td>
                  <td>{a.start || "—"}</td>
                  <td>{a.end || "—"}</td>
                  <td>
                    {getStatusDot(a.status)}
                    {a.status}
                  </td>
                  <td>
                    {a.status === "active" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRevoke(a.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Conflict Modal */}
      {conflict && (
        <div className="modal-overlay open">
          <div className="modal">
            <h2>Exclusivity Conflict</h2>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>
              Role &quot;{assignForm.designation}&quot; is already held by {conflict.name}. 
              Reassigning will transfer all pending responsibilities immediately. Proceed?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConflict(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleAssign(true)}>
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 980, width: "95%" }}>
            <h2>{editingRole ? "Edit Role" : "Create Role"}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Role Name<span className="req">*</span></label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <input
                  type="text"
                  value={editingRole ? (editingRole.is_active ? "Active" : "Inactive") : "Active"}
                  disabled
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Description</label>
              <textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{ width: "100%", border: "1.5px solid #dde3ec", borderRadius: 8, padding: 10 }}
              />
            </div>

            <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #dde3ec", borderRadius: 8 }}>
              <table className="role-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Permission Module</th>
                    <th>View</th>
                    <th>Create</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {roleForm.permissions.map((permission, index) => (
                    <tr key={permission.module}>
                      <td>{permission.module}</td>
                      <td><input type="checkbox" checked={permission.view} onChange={() => toggleRolePermission(index, "view")} /></td>
                      <td><input type="checkbox" checked={permission.create} onChange={() => toggleRolePermission(index, "create")} /></td>
                      <td><input type="checkbox" checked={permission.edit} onChange={() => toggleRolePermission(index, "edit")} /></td>
                      <td><input type="checkbox" checked={permission.delete} onChange={() => toggleRolePermission(index, "delete")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveRole} disabled={savingRole}>
                {savingRole ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
