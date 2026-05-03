const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1/system-admin';
const JWT  = import.meta.env.VITE_JWT_BASE  || 'http://127.0.0.1:8000/api';

export const API_ROUTES = {
  TOKEN:          `${JWT}/token/`,
  TOKEN_REFRESH:  `${JWT}/token/refresh/`,
  DEPARTMENTS:    `${BASE}/departments/`,
  BATCHES:        `${BASE}/batches/`,
  PROGRAMMES:     `${BASE}/programmes/`,
  DESIGNATIONS:   `${BASE}/designations/`,
  USERS:          `${BASE}/users/`,
  ADD_STUDENT:    `${BASE}/users/add-student/`,
  ADD_FACULTY:    `${BASE}/users/add-faculty/`,
  ADD_STAFF:      `${BASE}/users/add-staff/`,
  BULK_CREATE_USERS: `${BASE}/users/bulk-create/`,
  ACTIVATE:       `${BASE}/users/activate/`,
  DEACTIVATE:     `${BASE}/users/deactivate/`,
  ARCHIVE:        `${BASE}/users/archive/`,
  RESET_PASSWORD: `${BASE}/users/reset-password/`,
  IMPORT_USERS:   `${BASE}/users/import/`,
  EXPORT_USERS:   `${BASE}/users/export/`,
  ROLES:          `${BASE}/roles/`,
  MANAGE_ROLES:   `${BASE}/roles/manage/`,
  MODIFY_ROLE:    (id) => `${BASE}/roles/manage/${id}/`,
  DEACTIVATE_ROLE:(id) => `${BASE}/roles/manage/${id}/deactivate/`,
  ASSIGNABLE_ROLES: `${BASE}/roles/assignable/`,
  ASSIGN_ROLE:    `${BASE}/roles/assign/`,
  REASSIGN_ROLE:  `${BASE}/roles/reassign/`,
  REVOKE_ROLE:    (id) => `${BASE}/roles/${id}/revoke/`,
  AUDIT_LOGS:     `${BASE}/audit-logs/`,
  
  // New endpoints
  DEPARTMENT_HIERARCHY: `${BASE}/departments/hierarchy/`,
  ASSIGN_HOD:           `${BASE}/departments/assign-hod/`,
  STATS:                `${BASE}/stats/`,
  STUDENTS:             `${BASE}/users/students/`,
  FACULTY:              `${BASE}/users/faculty/`,
  STAFF:                `${BASE}/users/staff/`,
};
