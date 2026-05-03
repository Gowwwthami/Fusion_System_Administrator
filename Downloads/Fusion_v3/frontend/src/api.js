import { API_ROUTES } from './routes/api_routes';

function getToken() { return localStorage.getItem('fusion_access_token'); }

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json() : await res.text();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

// Auth
export async function login(username, password) {
  const res = await fetch(API_ROUTES.TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  localStorage.setItem('fusion_access_token', data.access);
  localStorage.setItem('fusion_refresh_token', data.refresh);
  return data;
}

// Reference data
export const getDepartments  = () => request(API_ROUTES.DEPARTMENTS);
export const getBatches      = () => request(API_ROUTES.BATCHES);
export const getProgrammes   = () => request(API_ROUTES.PROGRAMMES);
export const getDesignations = () => request(API_ROUTES.DESIGNATIONS);

// Users
export const getUsers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${API_ROUTES.USERS}${qs ? '?' + qs : ''}`);
};
export const addStudent    = (data) => request(API_ROUTES.ADD_STUDENT, { method: 'POST', body: JSON.stringify(data) });
export const addFaculty    = (data) => request(API_ROUTES.ADD_FACULTY, { method: 'POST', body: JSON.stringify(data) });
export const addStaff      = (data) => request(API_ROUTES.ADD_STAFF,   { method: 'POST', body: JSON.stringify(data) });
export const bulkCreateUsers = (user_type, users) =>
  request(API_ROUTES.BULK_CREATE_USERS, { method: 'POST', body: JSON.stringify({ user_type, users }) });
export const activateUser   = (username) => request(API_ROUTES.ACTIVATE,       { method: 'POST', body: JSON.stringify({ username }) });
export const deactivateUser = (username) => request(API_ROUTES.DEACTIVATE,     { method: 'POST', body: JSON.stringify({ username }) });
export const archiveUser    = (username) => request(API_ROUTES.ARCHIVE,        { method: 'POST', body: JSON.stringify({ username }) });
export const resetPassword  = (username, new_password) => request(API_ROUTES.RESET_PASSWORD, { method: 'POST', body: JSON.stringify({ username, new_password }) });

export const exportUsers = (user_type) => {
  const url = `${API_ROUTES.EXPORT_USERS}${user_type ? '?user_type=' + user_type : ''}`;
  const a = document.createElement('a');
  a.href = url; a.download = 'users.csv';
  document.body.appendChild(a); a.click(); a.remove();
};

export async function importUsers(file, user_type) {
  const fd = new FormData();
  fd.append('file', file); fd.append('user_type', user_type);
  const token = getToken();
  const res = await fetch(API_ROUTES.IMPORT_USERS, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// Roles
export const getUserRoles  = (username) => request(`${API_ROUTES.ROLES}user/?username=${username}`);
export const getAssignableRoles = (username) => request(`${API_ROUTES.ROLES}assignable/?username=${username}`);
export const getSystemRoles = () => request(`${API_ROUTES.ROLES}list/`);
export const getAvailablePermissionModules = () => request(`${API_ROUTES.ROLES}permissions/`);
export const createSystemRole = (data) => request(API_ROUTES.ROLES, { method: 'POST', body: JSON.stringify(data) });
export const modifySystemRole = (id, data) => request(`${API_ROUTES.ROLES}${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deactivateSystemRole = (id) => request(`${API_ROUTES.ROLES}${id}/deactivate/`, { method: 'PATCH' });
export const assignRole    = (data)     => request(API_ROUTES.ASSIGN_ROLE,  { method: 'POST',  body: JSON.stringify(data) });
export const reassignRole  = (hold_id, new_designation_id) => request(API_ROUTES.REASSIGN_ROLE, { method: 'PATCH', body: JSON.stringify({ hold_id, new_designation_id }) });
export const revokeRole    = (hold_id)  => request(API_ROUTES.REVOKE_ROLE(hold_id), { method: 'DELETE' });

// Audit logs
export const getAuditLogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${API_ROUTES.AUDIT_LOGS}${qs ? '?' + qs : ''}`);
};

// Department hierarchy
export const getDepartmentHierarchy = (department = null) => {
  const url = department 
    ? `${API_ROUTES.DEPARTMENT_HIERARCHY}?department=${department}`
    : API_ROUTES.DEPARTMENT_HIERARCHY;
  return request(url);
};

export const assignDepartmentHead = (department_id, user_id) => 
  request(API_ROUTES.ASSIGN_HOD, { 
    method: 'POST', 
    body: JSON.stringify({ department_id, user_id }) 
  });

// Stats
export const getStats = () => request(API_ROUTES.STATS);

// User Directory
export const getStudents = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${API_ROUTES.STUDENTS}${qs ? '?' + qs : ''}`);
};

export const getFaculty = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${API_ROUTES.FACULTY}${qs ? '?' + qs : ''}`);
};

export const getStaff = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${API_ROUTES.STAFF}${qs ? '?' + qs : ''}`);
};
