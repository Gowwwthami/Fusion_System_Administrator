"""
URL configuration for System Admin API v1.
All 21 original endpoints preserved + improvements.
"""

from django.urls import path
from . import views

app_name = "system_admin"

urlpatterns = [
    # Reference Data
    path("departments/", views.departments, name="departments"),
    path("batches/", views.batches, name="batches"),
    path("programmes/", views.programmes, name="programmes"),
    path("designations/", views.view_designations, name="view-designations"),

    # User Management
    path("users/", views.list_users, name="list-users"),
    path("users/students/", views.list_students, name="list-students"),
    path("users/faculty/", views.list_faculty, name="list-faculty"),
    path("users/staff/", views.list_staff, name="list-staff"),
    path("users/filters/", views.user_directory_filters, name="user-directory-filters"),
    path("users/add-student/", views.add_student, name="add-student"),
    path("users/add-faculty/", views.add_faculty, name="add-faculty"),
    path("users/add-staff/", views.add_staff, name="add-staff"),
    path("users/bulk-create/", views.bulk_create_users, name="bulk-create-users"),
    path("users/activate/", views.activate_user, name="activate-user"),
    path("users/deactivate/", views.deactivate_user, name="deactivate-user"),
    path("users/archive/", views.archive_user, name="archive-user"),
    path("users/reset-password/", views.reset_password, name="reset-password"),
    path("users/import/", views.import_users, name="import-users"),
    path("users/export/", views.export_users, name="export-users"),

    # Role Management
    path("roles/", views.manage_system_roles, name="system-roles"),
    path("roles/assignable/", views.get_assignable_roles, name="get-assignable-roles"),
    path("roles/user/", views.get_user_roles, name="get-user-roles"),
    path("roles/list/", views.list_system_roles, name="list-system-roles"),
    path("roles/permissions/", views.available_permission_modules, name="available-permission-modules"),
    path("roles/<int:role_id>/", views.modify_system_role, name="modify-system-role"),
    path("roles/<int:role_id>/deactivate/", views.deactivate_system_role, name="deactivate-system-role"),
    path("roles/assignments/", views.list_role_assignments, name="list-role-assignments"),
    path("roles/module-access/", views.get_module_access, name="get-module-access"),
    path("roles/assign/", views.assign_role, name="assign-role"),
    path("roles/reassign/", views.reassign_role, name="reassign-role"),
    path("roles/<int:hold_id>/revoke/", views.revoke_role, name="revoke-role"),

    # Audit Logs
    path("audit-logs/", views.audit_logs, name="audit-logs"),

    # Stats
    path("stats/", views.get_stats, name="get-stats"),

    # Mail Batch
    path("users/mail-batch/", views.mail_batch, name="mail-batch"),

    # ═══════════════════════════════════════════════════════════════════════════
    # NEW USE CASE ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════

    # UC-014: Archived Users List
    path("archived-users/", views.list_archived_users, name="list-archived-users"),

    # UC-015: Switch Role
    path("users/switch-role/", views.switch_role, name="switch-role"),
    path("users/active-role/", views.get_active_role, name="get-active-role"),

    # UC-022: Emergency Access
    path("emergency-access/grant/", views.grant_emergency_access, name="grant-emergency-access"),
    path("emergency-access/request/", views.request_emergency_access, name="request-emergency-access"),
    path("emergency-access/<int:access_id>/approve/", views.approve_emergency_access, name="approve-emergency-access"),
    path("emergency-access/<int:access_id>/decline/", views.decline_emergency_access, name="decline-emergency-access"),
    path("emergency-access/<int:access_id>/revoke/", views.revoke_emergency_access, name="revoke-emergency-access"),
    path("emergency-access/", views.list_emergency_accesses, name="list-emergency-accesses"),

    # Business Rule Validation
    path("validate/role-assignment/", views.validate_role_assignment, name="validate-role-assignment"),

    # UC-007: Department Hierarchy
    path("departments/hierarchy/", views.department_hierarchy, name="department-hierarchy"),
    path("departments/assign-hod/", views.assign_department_head, name="assign-department-head"),
]
