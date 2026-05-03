// src/services/api.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1/system-admin";

function getToken() {
  // Check both token keys for compatibility
  return localStorage.getItem("access_token") || localStorage.getItem("fusion_access_token");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
    return;
  }

  const data = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  // Extract base URL without the /api/v1/system-admin path
  const baseServerUrl = baseUrl.includes('/api/v1/system-admin') 
    ? baseUrl.replace('/api/v1/system-admin', '') 
    : baseUrl;
  
  const res = await fetch(`${baseServerUrl}/api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}

// ── Reference Data ────────────────────────────────────────────────────────────
export const getDepartments = () => request("/departments/");
export const getBatches = () => request("/batches/");
export const getProgrammes = () => request("/programmes/");
export const getDesignations = () => request("/designations/");

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/users/${qs ? "?" + qs : ""}`);
};

// User Directory - Filtered lists
export const getStudents = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.append("q", params.q);
  Object.entries(params).forEach(([key, values]) => {
    if (key !== "q" && Array.isArray(values)) {
      values.forEach((v) => qs.append(key, v));
    }
  });
  const queryString = qs.toString();
  return request(`/users/students/${queryString ? "?" + queryString : ""}`);
};

export const getFaculty = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.append("q", params.q);
  Object.entries(params).forEach(([key, values]) => {
    if (key !== "q" && Array.isArray(values)) {
      values.forEach((v) => qs.append(key, v));
    }
  });
  const queryString = qs.toString();
  return request(`/users/faculty/${queryString ? "?" + queryString : ""}`);
};

export const getStaff = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.append("q", params.q);
  Object.entries(params).forEach(([key, values]) => {
    if (key !== "q" && Array.isArray(values)) {
      values.forEach((v) => qs.append(key, v));
    }
  });
  const queryString = qs.toString();
  return request(`/users/staff/${queryString ? "?" + queryString : ""}`);
};

export const getUserDirectoryFilters = () => request("/users/filters/");

export const addStudent = (data) =>
  request("/users/add-student/", { method: "POST", body: JSON.stringify(data) });

export const addFaculty = (data) =>
  request("/users/add-faculty/", { method: "POST", body: JSON.stringify(data) });

export const addStaff = (data) =>
  request("/users/add-staff/", { method: "POST", body: JSON.stringify(data) });

export const bulkCreateUsers = (user_type, users) =>
  request("/users/bulk-create/", {
    method: "POST",
    body: JSON.stringify({ user_type, users }),
  });

export const activateUser = (username) =>
  request("/users/activate/", { method: "POST", body: JSON.stringify({ username }) });

export const deactivateUser = (username) =>
  request("/users/deactivate/", { method: "POST", body: JSON.stringify({ username }) });

export const archiveUser = (userIdOrUsername, reason, retentionYears = 3) =>
  request("/users/archive/", {
    method: "POST",
    body: JSON.stringify({
      user_id: typeof userIdOrUsername === 'number' ? userIdOrUsername : undefined,
      username: typeof userIdOrUsername === 'string' ? userIdOrUsername : undefined,
      reason,
      retention_years: retentionYears
    }),
  });

export const resetPassword = (username, new_password) =>
  request("/users/reset-password/", { method: "POST", body: JSON.stringify({ username, new_password }) });

export const exportUsers = (user_type) => {
  const token = getToken();
  const url = `${BASE_URL}/users/export/${user_type ? "?user_type=" + user_type : ""}`;
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "users_export.csv");
  link.setAttribute("Authorization", `Bearer ${token}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export async function importUsers(file, user_type) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_type", user_type);
  const res = await fetch(`${BASE_URL}/users/import/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getUserRoles = (username) => request(`/roles/user/?username=${username}`);
export const getAssignableRoles = (username) => request(`/roles/assignable/?username=${username}`);

export const getSystemRoles = () => request("/roles/list/");

export const getAvailablePermissionModules = () => request("/roles/permissions/");

export const createSystemRole = (data) =>
  request("/roles/", { method: "POST", body: JSON.stringify(data) });

export const modifySystemRole = (roleId, data) =>
  request(`/roles/${roleId}/`, { method: "PUT", body: JSON.stringify(data) });

export const deactivateSystemRole = (roleId) =>
  request(`/roles/${roleId}/deactivate/`, { method: "PATCH" });

export const getRoleAssignments = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/roles/assignments/${qs ? "?" + qs : ""}`);
};

export const getModuleAccess = (role) => request(`/roles/module-access/?role=${encodeURIComponent(role)}`);

export const assignRole = (data) =>
  request("/roles/assign/", { method: "POST", body: JSON.stringify(data) });

export const reassignRole = (hold_id, new_designation_id) =>
  request("/roles/reassign/", { method: "PATCH", body: JSON.stringify({ hold_id, new_designation_id }) });

export const revokeRole = (hold_id) =>
  request(`/roles/${hold_id}/revoke/`, { method: "DELETE" });

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const getAuditLogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/audit-logs/${qs ? "?" + qs : ""}`);
};

export const exportLogs = (logs) => {
  const rows = [
    "Type,Message,Timestamp",
    ...logs.map((l) => `${l.action},"${JSON.stringify(l.details)}",${l.timestamp}`),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "audit_logs.csv";
  a.click();
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = () => request("/stats/");

// ── Mail Batch ────────────────────────────────────────────────────────────────
export const mailBatch = (batch_year) =>
  request("/users/mail-batch/", { method: "POST", body: JSON.stringify({ batch_year }) });

// ═══════════════════════════════════════════════════════════════════════════════
// NEW USE CASE API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── UC-014: Archived Users List ────────────────────────────────────────────────
export const getArchivedUsers = () => request("/archived-users/");

// ── UC-015: Switch Role ────────────────────────────────────────────────────────
export const switchRole = (designationId) =>
  request("/users/switch-role/", {
    method: "POST",
    body: JSON.stringify({ designation_id: designationId }),
  });

export const getActiveRole = () => request("/users/active-role/");

// ── UC-022: Emergency Access ───────────────────────────────────────────────────
export const grantEmergencyAccess = (userId, approverName, approverDesignation, justification, durationHours = 24) =>
  request("/emergency-access/grant/", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      approver_name: approverName,
      approver_designation: approverDesignation,
      justification,
      duration_hours: durationHours,
    }),
  });

export const requestEmergencyAccess = (payload) =>
  request("/emergency-access/request/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const approveEmergencyAccess = (accessId, payload) =>
  request(`/emergency-access/${accessId}/approve/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const declineEmergencyAccess = (accessId, payload) =>
  request(`/emergency-access/${accessId}/decline/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const revokeEmergencyAccess = (accessId) =>
  request(`/emergency-access/${accessId}/revoke/`, { method: "POST" });

export const getEmergencyAccesses = () => request("/emergency-access/");

// ── Business Rule Validation ───────────────────────────────────────────────────
export const validateRoleAssignment = (userId, designationId) =>
  request("/validate/role-assignment/", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, designation_id: designationId }),
  });
