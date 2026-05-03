"""
Services for System Admin Module.
All business logic, email handling, and helper functions centralized here
per audit fixes S1, S4, S9, R1-R7.
"""

import csv
import io
import json
import logging
from datetime import date, datetime
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.utils.crypto import get_random_string

from .models import (
    GlobalsExtrainfo,
    GlobalsDepartmentinfo,
    Batch,
    GlobalsDesignation,
    GlobalsHoldsDesignation,
    Programme,
    Student,
    GlobalsFaculty,
    Staff,
    AuditLog,
    UserStatus,
    UserType,
    StudentCategory,
    RoleConflictMatrix,
    RoleModulePermission,
    ArchivedUserData,
    EmergencyAccessLog,
    UserRoleSession,
)
from .constants import (
    DEFAULT_PHONE_NO,
    NOTIFICATION_USER_CREATED,
    NOTIFICATION_ROLE_ASSIGNED,
    NOTIFICATION_ROLE_REASSIGNED,
    NOTIFICATION_ROLE_EXPIRY,
    NOTIFICATION_ACCOUNT_DEACTIVATED,
    NOTIFICATION_ACCOUNT_ARCHIVED,
    NOTIFICATION_PASSWORD_RESET,
    REQUIRED_FIELDS_STUDENT,
    REQUIRED_FIELDS_FACULTY,
    REQUIRED_FIELDS_STAFF,
    CSV_COLUMNS_STUDENT,
    CSV_COLUMNS_FACULTY,
    CSV_COLUMNS_STAFF,
)
from . import selectors

logger = logging.getLogger(__name__)


# ── RBAC Module Access Configuration ──────────────────────────────────────────

MODULE_ACCESS = {
    "Mess Admin": [
        {"module": "Mess Menu", "view": True, "create": True, "edit": True, "delete": True},
        {"module": "Mess Billing", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Feedback", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "User Directory", "view": False, "create": False, "edit": False, "delete": False},
    ],
    "Mess Caretaker": [
        {"module": "Mess Menu", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Mess Billing", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "Feedback", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "User Directory", "view": False, "create": False, "edit": False, "delete": False},
    ],
    "Mess Warden": [
        {"module": "Mess Menu", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "Mess Billing", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "Feedback", "view": True, "create": False, "edit": False, "delete": False},
        {"module": "Warden Reports", "view": True, "create": True, "edit": True, "delete": False},
    ],
    "Library Admin": [
        {"module": "Library Catalog", "view": True, "create": True, "edit": True, "delete": True},
        {"module": "Member Management", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Circulation", "view": True, "create": True, "edit": True, "delete": False},
    ],
    "Academic Admin": [
        {"module": "Academic Records", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Timetable", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Exam Schedule", "view": True, "create": True, "edit": True, "delete": False},
    ],
    "Hostel Admin": [
        {"module": "Hostel Allotment", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Hostel Complaints", "view": True, "create": True, "edit": True, "delete": False},
    ],
    "Finance Admin": [
        {"module": "Fee Management", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Payroll", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Accounts", "view": True, "create": True, "edit": True, "delete": True},
    ],
    "Placement Admin": [
        {"module": "Placement Records", "view": True, "create": True, "edit": True, "delete": False},
        {"module": "Company Management", "view": True, "create": True, "edit": True, "delete": False},
    ],
}

# Exclusive roles - only one active user can hold these at a time
EXCLUSIVE_ROLES = ["Mess Caretaker", "Mess Warden", "Hostel Admin", "HOD", "Head of Department"]

GENERAL_ASSIGNABLE_ROLES = {
    "Mess Admin",
    "Mess Caretaker",
    "Mess Warden",
    "Library Admin",
    "Academic Admin",
    "Hostel Admin",
    "Finance Admin",
    "Placement Admin",
}

FACULTY_ASSIGNABLE_ROLES = {
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "HOD",
    "Head of Department",
}

STAFF_ASSIGNABLE_ROLES = {
    "Technical Staff",
    "Administrative Staff",
    "Lab Assistant",
}


def get_module_access_for_role(role_name: str) -> list:
    """Get module access permissions for a role"""
    role = selectors.get_designation_by_name(role_name)
    if role:
        mapped = list(
            RoleModulePermission.objects.filter(designation=role).values(
                "module", "view", "create", "edit", "delete"
            )
        )
        if mapped:
            return mapped
    return MODULE_ACCESS.get(role_name, [])


def get_available_permission_modules() -> list:
    """Return the canonical module list for role permission configuration."""
    modules = []
    seen = set()
    for entries in MODULE_ACCESS.values():
        for item in entries:
            module = item["module"]
            if module in seen:
                continue
            seen.add(module)
            modules.append({"module": module, "view": False, "create": False, "edit": False, "delete": False})
    return modules


def _has_active_hod_for_department(department) -> bool:
    if not department:
        return False

    return GlobalsHoldsDesignation.objects.filter(
        designation__name__in=["HOD", "Head of Department"],
        user__extrainfo__department=department,
    ).exists()


def is_role_assignable_to_user(extra_info: GlobalsExtrainfo, designation: GlobalsDesignation) -> tuple[bool, str]:
    if not extra_info or not designation:
        return False, "User profile or role not found"

    user_type = extra_info.user_type
    role_name = designation.name

    if role_name in ["HOD", "Head of Department"]:
        if user_type != UserType.FACULTY:
            return False, "Only faculty can be assigned HOD roles"
        if not extra_info.department:
            return False, "User department is required for HOD role"
        if _has_active_hod_for_department(extra_info.department):
            return False, f"{extra_info.department.name} already has an active HOD"
        return True, ""

    if user_type == UserType.FACULTY:
        if role_name in FACULTY_ASSIGNABLE_ROLES or role_name in GENERAL_ASSIGNABLE_ROLES:
            return True, ""
        return False, "This role is not eligible for faculty users"

    if user_type == UserType.STAFF:
        if role_name in STAFF_ASSIGNABLE_ROLES or role_name in GENERAL_ASSIGNABLE_ROLES:
            return True, ""
        return False, "This role is not eligible for staff users"

    return False, "This role is not eligible for the selected user"


def get_assignable_roles_for_user(extra_info: GlobalsExtrainfo) -> list:
    roles = selectors.get_system_roles()
    active_role_ids = set(
        GlobalsHoldsDesignation.objects.filter(user=extra_info.user).values_list("designation_id", flat=True)
    )
    eligible_roles = []
    for role in roles:
        if role.id in active_role_ids:
            continue
        can_assign, _ = is_role_assignable_to_user(extra_info, role)
        if can_assign:
            eligible_roles.append(role)
    return eligible_roles


def _save_role_permissions(role: GlobalsDesignation, permissions: list):
    RoleModulePermission.objects.filter(designation=role).delete()
    rows = [
        RoleModulePermission(
            designation=role,
            module=p.get("module", "").strip(),
            view=bool(p.get("view")),
            create=bool(p.get("create")),
            edit=bool(p.get("edit")),
            delete=bool(p.get("delete")),
        )
        for p in permissions
        if p.get("module")
    ]
    if rows:
        RoleModulePermission.objects.bulk_create(rows)


def _notify_role_change_users(role: GlobalsDesignation, subject: str, message: str):
    holders = GlobalsHoldsDesignation.objects.filter(
        designation=role,
    ).select_related("user")
    for hold in holders:
        email = hold.user.email
        _send_notification(email, subject, message)


@transaction.atomic
def create_system_role(data: dict, performed_by: User) -> dict:
    name = (data.get("name") or "").strip()
    if not name:
        return {"success": False, "error": "Role name is required"}

    if selectors.get_designation_by_name(name):
        return {"success": False, "error": "Role with this name already exists"}

    role = GlobalsDesignation.objects.create(
        name=name,
        full_name=data.get("description") or name,
        type="system",
        basic=False,
        category="system",
        dept_if_not_basic=None,
    )
    _save_role_permissions(role, data.get("permissions", []))

    _log_action("module_access", performed_by, None, {
        "operation": "create_role",
        "role": role.name,
        "permissions_count": len(data.get("permissions", [])),
    })
    return {"success": True, "role_id": role.id}


@transaction.atomic
def update_system_role(role_id: int, data: dict, performed_by: User) -> dict:
    role = selectors.get_system_role_by_id(role_id)
    if not role:
        return {"success": False, "error": "Role not found"}

    if "name" in data:
        next_name = (data.get("name") or "").strip()
        if not next_name:
            return {"success": False, "error": "Role name cannot be empty"}
        duplicate = GlobalsDesignation.objects.filter(name=next_name).exclude(id=role.id).exists()
        if duplicate:
            return {"success": False, "error": "Role name already in use"}
        role.name = next_name

    if "description" in data:
        role.full_name = data.get("description") or role.full_name

    role.save()

    if "permissions" in data:
        _save_role_permissions(role, data.get("permissions") or [])

    _log_action("module_access", performed_by, None, {
        "operation": "modify_role",
        "role": role.name,
    })
    _notify_role_change_users(
        role,
        "FusionERP: Role permissions updated",
        f"Permissions for role '{role.name}' have been updated by System Administration.",
    )
    return {"success": True}


@transaction.atomic
def deactivate_system_role(role_id: int, performed_by: User) -> dict:
    role = selectors.get_system_role_by_id(role_id)
    if not role:
        return {"success": False, "error": "Role not found"}

    revoked = GlobalsHoldsDesignation.objects.filter(designation=role).count()
    GlobalsHoldsDesignation.objects.filter(designation=role).delete()
    RoleModulePermission.objects.filter(designation=role).delete()
    role.delete()

    _log_action("module_access", performed_by, None, {
        "operation": "delete_role",
        "role": role.name,
        "revoked_assignments": revoked,
    })
    return {"success": True, "revoked_assignments": revoked}


def check_role_exclusivity(designation_name: str, exclude_user_id: int = None) -> dict:
    """Check if role is already assigned to another user (for exclusive roles)"""
    if designation_name not in EXCLUSIVE_ROLES:
        return {"has_conflict": False}

    qs = GlobalsHoldsDesignation.objects.filter(
        designation__name=designation_name,
    ).select_related("user")

    if exclude_user_id:
        qs = qs.exclude(user__id=exclude_user_id)

    active_holder = qs.first()
    if active_holder:
        return {
            "has_conflict": True,
            "current_holder": {
                "id": active_holder.user.id,
                "name": f"{active_holder.user.first_name} {active_holder.user.last_name}".strip(),
                "username": active_holder.user.username,
            }
        }
    return {"has_conflict": False}


def validate_role_assignment_suitability(extra_info: GlobalsExtrainfo, designation: GlobalsDesignation) -> tuple[bool, str]:
    """Validate whether a user profile is suitable for the target role."""
    if not extra_info:
        return False, "User profile not found"

    is_assignable, message = is_role_assignable_to_user(extra_info, designation)
    if not is_assignable:
        return False, message

    is_valid, message = validate_br_sa_001_eligibility(extra_info.user_type, designation.name)
    if not is_valid:
        return False, message

    is_valid, message = validate_br_sa_004_role_constraints(
        extra_info.user_type,
        designation.name,
        extra_info.department.name if extra_info.department else None,
    )
    if not is_valid:
        return False, message

    is_valid, message = check_br_sa_007_role_conflicts(extra_info.user, designation)
    if not is_valid:
        return False, message

    return True, ""


# ── Validation Helpers ────────────────────────────────────────────────────────

def validate_required_fields(data: dict, fields: list) -> list:
    """Returns list of missing required field names. Fix: R4."""
    return [f for f in fields if not data.get(f)]


def validation_error_response(missing_fields: list) -> dict:
    """Consistent missing-field error payload. Fix: R5."""
    return {
        "success": False,
        "error": f"Missing required fields: {', '.join(missing_fields)}",
    }


def handle_serializer_error(serializer, table_name: str = "") -> dict:
    """Consistent serializer error response. Fix: R6."""
    logger.warning("Serializer validation failed for %s: %s", table_name, serializer.errors)
    return {"success": False, "error": serializer.errors}


# ── Auth User Data Builders ───────────────────────────────────────────────────

def build_auth_user_data(data: dict) -> dict:
    """Build User creation dict. Fix: R1 - eliminates 3+ duplicate patterns."""
    return {
        "username": data["username"],
        "first_name": data.get("first_name", ""),
        "last_name": data.get("last_name", ""),
        "email": data.get("email", ""),
        "password": data.get("password", get_random_string(12)),
    }


def build_extra_info_data(data: dict, user_type: str, department: GlobalsDepartmentinfo) -> dict:
    """Build ExtraInfo dict. Fix: R2 - eliminates 3+ duplicate patterns."""
    gender = data.get("gender") or data.get("sex") or ""
    today = date.today()
    return {
        "id": data.get("roll_number") or data.get("username"),
        "user_type": user_type,
        "user_status": UserStatus.ACTIVE,
        "title": data.get("title") or "",
        "sex": gender,
        "date_of_birth": data.get("date_of_birth") or today,
        "address": data.get("address") or "",
        "phone_no": data.get("phone_no") or DEFAULT_PHONE_NO,
        "department": department,
        "profile_picture": data.get("profile_picture"),
        "about_me": data.get("about_me") or "",
        "date_modified": datetime.utcnow(),
    }


# ── Designation / Role Helpers ────────────────────────────────────────────────

def add_holds_designation(
    user: User,
    designation: GlobalsDesignation,
) -> GlobalsHoldsDesignation:
    """Assign a designation to a user. Fix: R3."""
    return GlobalsHoldsDesignation.objects.create(
        user=user,
        designation=designation,
        working=user,
    )


# ── User Creation Services ────────────────────────────────────────────────────

@transaction.atomic
def create_student(data: dict, performed_by: User) -> dict:
    missing = validate_required_fields(data, REQUIRED_FIELDS_STUDENT)
    if missing:
        return validation_error_response(missing)

    # Validate unique email and username (BR-SA-011)
    is_unique, unique_msg = validate_br_sa_011_unique_user(data['email'], data['username'])
    if not is_unique:
        return {"success": False, "error": unique_msg}

    department = selectors.get_default_department()
    if data.get("department_id"):
        department = selectors.get_department_by_name(data["department_id"]) or department

    batch = selectors.get_batch_by_id(data.get("batch_id")) if data.get("batch_id") else None
    if not batch:
        return {"success": False, "error": "Invalid batch_id. Please select a valid batch."}
    
    programme = selectors.get_programme_by_id(data.get("programme_id")) if data.get("programme_id") else None
    if not programme:
        return {"success": False, "error": "Invalid programme_id. Please select a valid programme."}

    auth_data = build_auth_user_data(data)
    
    try:
        user = User.objects.create_user(**auth_data)
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        return {"success": False, "error": f"Failed to create user account: {str(e)}"}

    # Build extra info with additional fields
    extra_data = build_extra_info_data(data, UserType.STUDENT, department)
    if data.get("gender"):
        extra_data["sex"] = data["gender"]
    if data.get("title"):
        extra_data["title"] = data["title"]

    try:
        extra_info = GlobalsExtrainfo.objects.create(user=user, **extra_data)
    except Exception as e:
        logger.error(f"Failed to create extra info: {str(e)}")
        user.delete()  # Rollback user creation
        return {"success": False, "error": f"Failed to create user profile: {str(e)}"}

    try:
        semester_raw = str(data.get("semester") or "").strip()
        semester_no = int(semester_raw) if semester_raw.isdigit() else 1
        Student.objects.create(
            id=extra_info,
            programme=programme.name,
            batch=batch.year,
            batch_id=batch,
            category=data.get("category", "GEN"),
            curr_semester_no=semester_no,
            father_name=data.get("father_name"),
            mother_name=data.get("mother_name"),
        )
    except Exception as e:
        logger.error(f"Failed to create student info: {str(e)}")
        extra_info.delete()
        user.delete()
        return {"success": False, "error": f"Failed to create student record: {str(e)}"}

    _log_action("user_created", performed_by, user, {"user_type": "student"})
    send_account_created_email(user, auth_data["password"], {"user_type": "student"})
    return {"success": True, "user_id": user.id, "username": user.username}


@transaction.atomic
def create_faculty(data: dict, performed_by: User) -> dict:
    missing = validate_required_fields(data, REQUIRED_FIELDS_FACULTY)
    if missing:
        return validation_error_response(missing)

    # Validate unique email and username (BR-SA-011)
    is_unique, unique_msg = validate_br_sa_011_unique_user(data['email'], data['username'])
    if not is_unique:
        return {"success": False, "error": unique_msg}

    department = selectors.get_department_by_name(data.get("department_id", "")) or selectors.get_default_department()
    if not department:
        return {"success": False, "error": "Invalid department. Please select a valid department."}
    
    designation = selectors.get_designation_by_id(data["designation_id"])
    if not designation:
        return {"success": False, "error": "Invalid designation. Please select a valid designation."}

    auth_data = build_auth_user_data(data)
    
    try:
        user = User.objects.create_user(**auth_data)
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        return {"success": False, "error": f"Failed to create user account: {str(e)}"}

    try:
        extra_info = GlobalsExtrainfo.objects.create(
            user=user, **build_extra_info_data(data, UserType.FACULTY, department)
        )
    except Exception as e:
        logger.error(f"Failed to create extra info: {str(e)}")
        user.delete()
        return {"success": False, "error": f"Failed to create user profile: {str(e)}"}

    try:
        GlobalsFaculty.objects.create(id=extra_info)
    except Exception as e:
        logger.error(f"Failed to create faculty info: {str(e)}")
        extra_info.delete()
        user.delete()
        return {"success": False, "error": f"Failed to create faculty record: {str(e)}"}

    if designation:
        add_holds_designation(user, designation)

    _log_action("user_created", performed_by, user, {"user_type": "faculty"})
    send_account_created_email(user, auth_data["password"], {"user_type": "faculty"})
    return {"success": True, "user_id": user.id, "username": user.username}


@transaction.atomic
def create_staff(data: dict, performed_by: User) -> dict:
    missing = validate_required_fields(data, REQUIRED_FIELDS_STAFF)
    if missing:
        return validation_error_response(missing)

    # Validate unique email and username (BR-SA-011)
    is_unique, unique_msg = validate_br_sa_011_unique_user(data['email'], data['username'])
    if not is_unique:
        return {"success": False, "error": unique_msg}

    department = selectors.get_department_by_name(data.get("department_id", "")) or selectors.get_default_department()
    if not department:
        return {"success": False, "error": "Invalid department. Please select a valid department."}
    
    designation = selectors.get_designation_by_id(data["designation_id"])
    if not designation:
        return {"success": False, "error": "Invalid designation. Please select a valid designation."}

    auth_data = build_auth_user_data(data)
    
    try:
        user = User.objects.create_user(**auth_data)
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        return {"success": False, "error": f"Failed to create user account: {str(e)}"}

    try:
        extra_info = GlobalsExtrainfo.objects.create(
            user=user, **build_extra_info_data(data, UserType.STAFF, department)
        )
    except Exception as e:
        logger.error(f"Failed to create extra info: {str(e)}")
        user.delete()
        return {"success": False, "error": f"Failed to create user profile: {str(e)}"}

    try:
        Staff.objects.create(id=extra_info)
    except Exception as e:
        logger.error(f"Failed to create staff info: {str(e)}")
        extra_info.delete()
        user.delete()
        return {"success": False, "error": f"Failed to create staff record: {str(e)}"}

    if designation:
        add_holds_designation(user, designation)

    _log_action("user_created", performed_by, user, {"user_type": "staff"})
    send_account_created_email(user, auth_data["password"], {"user_type": "staff"})
    return {"success": True, "user_id": user.id, "username": user.username}


# ── User Status Services ──────────────────────────────────────────────────────

def activate_user(username: str, performed_by: User) -> dict:
    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return {"success": False, "error": "User not found"}
    if extra_info.user_status == UserStatus.ARCHIVED:
        return {"success": False, "error": "Cannot activate an archived user"}

    extra_info.user_status = UserStatus.ACTIVE
    extra_info.user.is_active = True
    extra_info.user.save()
    extra_info.save()
    _log_action("user_activated", performed_by, extra_info.user, {})
    return {"success": True}


def deactivate_user(username: str, performed_by: User) -> dict:
    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return {"success": False, "error": "User not found"}

    extra_info.user_status = UserStatus.INACTIVE
    extra_info.user.is_active = False
    extra_info.user.save()
    extra_info.save()
    _log_action("user_deactivated", performed_by, extra_info.user, {})
    _send_notification(extra_info.user.email, NOTIFICATION_ACCOUNT_DEACTIVATED, "Your account has been deactivated.")
    return {"success": True}


def archive_user(username: str, performed_by: User) -> dict:
    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return {"success": False, "error": "User not found"}

    extra_info.user_status = UserStatus.ARCHIVED
    extra_info.user.is_active = False
    extra_info.user.save()
    extra_info.save()
    # Revoke all active roles
    GlobalsHoldsDesignation.objects.filter(user=extra_info.user).delete()
    _log_action("user_archived", performed_by, extra_info.user, {})
    _send_notification(extra_info.user.email, NOTIFICATION_ACCOUNT_ARCHIVED, "Your account has been archived.")
    return {"success": True}


# ── Role Assignment Services ──────────────────────────────────────────────────

@transaction.atomic
def assign_role(data: dict, performed_by: User, force: bool = False) -> dict:
    username = data.get("username")
    designation_id = data.get("designation_id")
    if not username or not designation_id:
        return validation_error_response(["username", "designation_id"])

    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return {"success": False, "error": "User not found"}

    designation = selectors.get_designation_by_id(designation_id)
    if not designation:
        return {"success": False, "error": "Designation not found"}

    already_active = GlobalsHoldsDesignation.objects.filter(
        user=extra_info.user,
        designation_id=designation.id,
    ).exists()
    if already_active:
        return {"success": False, "error": "User already holds this role"}

    is_suitable, suitability_error = validate_role_assignment_suitability(extra_info, designation)
    if not is_suitable:
        return {"success": False, "error": suitability_error}

    # Check for exclusivity conflicts
    exclusivity_check = check_role_exclusivity(designation.name, exclude_user_id=extra_info.user.id)
    if exclusivity_check["has_conflict"] and not force:
        return {
            "success": False,
            "error": "Exclusivity Conflict",
            "conflict": exclusivity_check["current_holder"],
            "message": f'Role "{designation.name}" is already held by {exclusivity_check["current_holder"]["name"]}. Reassigning will transfer all pending responsibilities immediately.'
        }

    # If forcing, revoke from current holder
    if exclusivity_check["has_conflict"] and force:
        current_holder = GlobalsHoldsDesignation.objects.filter(
            designation__name=designation.name
        ).exclude(user__id=extra_info.user.id).first()
        if current_holder:
            _log_action("role_revoked", performed_by, current_holder.user,
                       {"designation": designation.name, "reason": "reassignment"})
            current_holder.delete()

    hold = add_holds_designation(
        extra_info.user,
        designation,
    )
    _log_action("role_assigned", performed_by, extra_info.user, {"designation": designation.name})
    _send_notification(
        extra_info.user.email,
        NOTIFICATION_ROLE_ASSIGNED,
        f"You have been assigned the role: {designation.name}.",
    )
    return {"success": True, "hold_id": hold.id}


@transaction.atomic
def reassign_role(hold_id: int, new_designation_id: int, performed_by: User) -> dict:
    hold = selectors.get_holds_designation_by_id(hold_id)
    if not hold:
        return {"success": False, "error": "Role assignment not found"}

    new_designation = selectors.get_designation_by_id(new_designation_id)
    if not new_designation:
        return {"success": False, "error": "New designation not found"}
    
    # Get user's extra_info for validation
    extra_info = getattr(hold.user, 'extrainfo', None)
    is_suitable, suitability_error = validate_role_assignment_suitability(extra_info, new_designation)
    if not is_suitable:
        return {"success": False, "error": suitability_error}

    old_name = hold.designation.name
    hold.designation = new_designation
    hold.save()
    _log_action(
        "role_reassigned",
        performed_by,
        hold.user,
        {"from": old_name, "to": new_designation.name},
    )
    _send_notification(
        hold.user.email,
        NOTIFICATION_ROLE_REASSIGNED,
        f"Your role has been changed from {old_name} to {new_designation.name}.",
    )
    return {"success": True}


def revoke_role(hold_id: int, performed_by: User) -> dict:
    hold = selectors.get_holds_designation_by_id(hold_id)
    if not hold:
        return {"success": False, "error": "Role assignment not found"}

    _log_action("role_revoked", performed_by, hold.user, {"designation": hold.designation.name})
    hold.delete()
    return {"success": True}


# ── Password Reset ────────────────────────────────────────────────────────────

def reset_password(username: str, new_password: str, performed_by: User) -> dict:
    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return {"success": False, "error": "User not found"}

    extra_info.user.set_password(new_password)
    extra_info.user.save()
    _log_action("password_reset", performed_by, extra_info.user, {})
    _send_notification(
        extra_info.user.email,
        NOTIFICATION_PASSWORD_RESET,
        "Your password has been reset by the System Administrator.",
    )
    return {"success": True}


# ── Bulk Import Service ───────────────────────────────────────────────────────

def bulk_import_users(csv_content: str, user_type: str, performed_by: User) -> dict:
    reader = csv.DictReader(io.StringIO(csv_content))
    results = {"created": [], "failed": []}

    creator_map = {
        "student": (create_student, REQUIRED_FIELDS_STUDENT),
        "faculty": (create_faculty, REQUIRED_FIELDS_FACULTY),
        "staff": (create_staff, REQUIRED_FIELDS_STAFF),
    }
    creator_fn, _ = creator_map.get(user_type, (None, None))
    if creator_fn is None:
        return {"success": False, "error": f"Unknown user type: {user_type}"}

    for row in reader:
        result = creator_fn(row, performed_by)
        if result.get("success"):
            results["created"].append(row.get("username"))
        else:
            results["failed"].append({"username": row.get("username"), "error": result.get("error")})

    _log_action(
        "bulk_import",
        performed_by,
        None,
        {"user_type": user_type, "created": len(results["created"]), "failed": len(results["failed"])},
    )
    return {"success": True, "results": results}


def bulk_create_users(users: list, user_type: str, performed_by: User) -> dict:
    """Create multiple users in one request and return per-user outcome."""
    results = {"created": [], "failed": []}

    creator_map = {
        "student": create_student,
        "faculty": create_faculty,
        "staff": create_staff,
    }
    creator_fn = creator_map.get(user_type)
    if creator_fn is None:
        return {"success": False, "error": f"Unknown user type: {user_type}"}

    for index, payload in enumerate(users, start=1):
        result = creator_fn(payload, performed_by)
        if result.get("success"):
            results["created"].append({"index": index, "username": result.get("username")})
            continue

        results["failed"].append(
            {
                "index": index,
                "username": payload.get("username"),
                "error": result.get("error"),
            }
        )

    _log_action(
        "bulk_import",
        performed_by,
        None,
        {
            "mode": "json_bulk_create",
            "user_type": user_type,
            "requested": len(users),
            "created": len(results["created"]),
            "failed": len(results["failed"]),
        },
    )
    return {"success": True, "results": results}


# ── Email Services ────────────────────────────────────────────────────────────

def _build_user_credentials_payload(user: User, password: str, context: dict | None = None) -> dict:
    context = context or {}
    full_name = user.get_full_name() or user.username
    return {
        "event": "user_credentials_created",
        "channel": "email",
        "recipient": {
            "name": full_name,
            "email": user.email,
            "username": user.username,
        },
        "credentials": {
            "username": user.username,
            "password": password,
        },
        "meta": {
            "user_id": user.id,
            "user_type": context.get("user_type"),
            "generated_at": datetime.utcnow().isoformat(),
        },
    }


def _send_notification_via_notifications_api(payload: dict) -> tuple[bool, str]:
    api_base = (settings.NOTIFICATIONS_API_BASE_URL or "").rstrip("/")
    api_token = settings.NOTIFICATIONS_API_TOKEN or ""
    if not api_base or not api_token:
        return False, "notifications_api_not_configured"

    endpoint = f"{api_base}/notifications/send"
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}",
        },
    )

    try:
        with urllib_request.urlopen(req, timeout=settings.NOTIFICATIONS_TIMEOUT_SECONDS) as resp:
            code = getattr(resp, "status", 200)
            if 200 <= code < 300:
                return True, "sent_via_notifications_api"
            return False, f"notifications_api_status_{code}"
    except HTTPError as exc:
        return False, f"notifications_api_http_{exc.code}"
    except URLError as exc:
        return False, f"notifications_api_unreachable_{exc.reason}"
    except Exception as exc:
        return False, f"notifications_api_error_{exc}"


def send_account_created_email(user: User, password: str, context: dict | None = None) -> bool:
    """
    Notification dispatch entry point for newly created user credentials.
    Ready for external Notifications API integration while preserving current email behavior.
    """
    payload = _build_user_credentials_payload(user, password, context)

    if settings.NOTIFICATIONS_PROVIDER == "notifications_api":
        sent, reason = _send_notification_via_notifications_api(payload)
        if sent:
            return True

        logger.warning("Notifications API dispatch failed for %s: %s", user.username, reason)
        if not settings.NOTIFICATIONS_FAIL_OPEN:
            return False

    message = (
        f"Welcome to Fusion ERP, {payload['recipient']['name']}.\n\n"
        "Your account has been created.\n"
        f"Username: {payload['credentials']['username']}\n"
        f"Password: {payload['credentials']['password']}\n\n"
        "Please change your password after first login."
    )
    _send_notification(user.email, NOTIFICATION_USER_CREATED, message)
    return True


def _send_notification(email: str, subject: str, message: str):
    """Internal notification helper."""
    if not email:
        return
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", email, exc)
        _log_failed_email(email, subject, str(exc))


def _log_failed_email(email: str, subject: str, error: str):
    """Log failed emails to file for later retry"""
    try:
        settings.FAILED_EMAILS_DIR.mkdir(parents=True, exist_ok=True)
        with open(settings.FAILED_EMAILS_FILE, "a") as f:
            f.write(f"{datetime.now().isoformat()} | {email} | {subject} | {error}\n")
    except Exception as exc:
        logger.error("Failed to log failed email: %s", exc)


# ── Password Generation and Mail Batch Services ───────────────────────────────

def generate_random_password(length: int = 10) -> str:
    """Generate a random password with letters, digits, and special characters"""
    import random
    import string
    characters = string.ascii_letters + string.digits + "@#$%&*"
    return ''.join(random.choice(characters) for _ in range(length))


def send_password_reset_email(user: User, new_password: str) -> bool:
    """Send password reset email to user"""
    subject = "Fusion ERP - Your Account Password"
    message = f"""Dear {user.get_full_name() or user.username},

Your password for Fusion ERP has been generated.

Username: {user.username}
Password: {new_password}

Please login and change your password immediately.

Best regards,
Fusion ERP Team
"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as exc:
        logger.error("Failed to send password email to %s: %s", user.email, exc)
        _log_failed_email(user.email, subject, str(exc))
        return False


def mail_batch_passwords(batch_year: str, performed_by: User) -> dict:
    """
    Generate passwords and send emails to all users in a batch.
    Returns summary of success/failure counts.
    """
    from .models import Student

    results = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "failed_users": [],
    }

    # Get all students in the batch
    students = Student.objects.select_related(
        "id", "id__user", "batch_id"
    ).filter(batch_id__year=batch_year)

    results["total"] = students.count()

    for student in students:
        user = student.id.user
        if not user.email:
            results["failed"] += 1
            results["failed_users"].append({"username": user.username, "reason": "No email address"})
            continue

        # Generate new password
        new_password = generate_random_password()

        # Update user password
        user.set_password(new_password)
        user.save()

        # Send email
        if send_password_reset_email(user, new_password):
            results["success"] += 1
            _log_action("password_reset", performed_by, user, {"batch": batch_year, "method": "mail_batch"})
        else:
            results["failed"] += 1
            results["failed_users"].append({"username": user.username, "reason": "Email sending failed"})

    return results


# ── UC-007: Manage Department Hierarchy ────────────────────────────────────────

def assign_department_head(department_id: str, user_id: int, performed_by: User) -> dict:
    """
    UC-007: Assign Head of Department to a department
    """
    department = selectors.get_department_by_name(department_id)
    if not department:
        return {"success": False, "error": "Department not found"}
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"success": False, "error": "User not found"}
    
    extra_info = getattr(user, 'extrainfo', None)
    if not extra_info:
        return {"success": False, "error": "User profile not found"}
    
    # Get or create HoD designation
    hod_designation, created = GlobalsDesignation.objects.get_or_create(
        name="Head of Department"
    )
    
    # Check if there's already an active HoD
    existing_hod = GlobalsHoldsDesignation.objects.filter(
        designation=hod_designation,
        user__extrainfo__department=department
    ).first()
    
    if existing_hod:
        # Revoke existing HoD
        _log_action("role_revoked", performed_by, existing_hod.user, {
            "designation": "Head of Department",
            "reason": "replaced by new HoD"
        })
        existing_hod.delete()
    
    # Assign new HoD
    hold = add_holds_designation(extra_info.user, hod_designation)
    
    # Update user's department if different
    if extra_info.department != department:
        extra_info.department = department
        extra_info.save()
    
    _log_action("department_head_assigned", performed_by, user, {
        "department": department.name,
        "previous_hod": existing_hod.user.username if existing_hod else None
    })
    
    return {
        "success": True,
        "message": f"{user.get_full_name()} assigned as Head of {department.name}",
        "hold_id": hold.id
    }


def get_department_hierarchy(department_id: str = None) -> dict:
    """
    UC-007: Get department hierarchy structure
    """
    if department_id:
        departments = GlobalsDepartmentinfo.objects.filter(name=department_id)
    else:
        departments = GlobalsDepartmentinfo.objects.all()
    
    hierarchy = []
    hod_designation = GlobalsDesignation.objects.filter(name="Head of Department").first()
    
    for dept in departments:
        # Get current HoD
        current_hod = None
        if hod_designation:
            hod_hold = GlobalsHoldsDesignation.objects.filter(
                designation=hod_designation,
                user__extrainfo__department=dept
            ).select_related("user").first()
            
            if hod_hold:
                current_hod = {
                    "id": hod_hold.user.id,
                    "username": hod_hold.user.username,
                    "name": f"{hod_hold.user.first_name} {hod_hold.user.last_name}".strip(),
                    "email": hod_hold.user.email
                }
        
        # Get user count
        user_count = GlobalsExtrainfo.objects.filter(department=dept).count()
        
        hierarchy.append({
            "id": dept.id,
            "name": dept.name,
            "head_of_department": current_hod,
            "user_count": user_count
        })
    
    return {"departments": hierarchy}


# ── Audit Logger ──────────────────────────────────────────────────────────────

def _log_action(action: str, performed_by: User, target_user, details: dict, request=None):
    """Enhanced audit logging with IP address and user agent tracking (BR-SA-008)"""
    AuditLog.objects.create(
        action=action,
        performed_by=performed_by,
        target_user=target_user,
        details={
            **details,
            "user_agent": request.META.get("HTTP_USER_AGENT", "Unknown") if request else None,
            "timestamp_utc": datetime.utcnow().isoformat(),
        },
        ip_address=_get_ip(request) if request else None,
    )


def _get_ip(request) -> str:
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return x_forwarded.split(",")[0] if x_forwarded else request.META.get("REMOTE_ADDR")


# ═══════════════════════════════════════════════════════════════════════════════
# BUSINESS RULES IMPLEMENTATION (BR-SA-001 to BR-SA-011)
# ═══════════════════════════════════════════════════════════════════════════════

def validate_br_sa_001_eligibility(user_type: str, designation: str) -> tuple[bool, str]:
    """
    BR-SA-001: Only Faculty/Staff can be Super Admin
    Returns: (is_valid, error_message)
    """
    super_admin_roles = ["Super Admin", "System Administrator", "Director", "Dean"]
    if designation in super_admin_roles and user_type not in [UserType.FACULTY, UserType.STAFF]:
        return False, f"Only Faculty/Staff can be assigned '{designation}' role"
    return True, ""


def validate_br_sa_002_mandatory_fields(user_data: dict) -> tuple[bool, str]:
    """
    BR-SA-002: Mandatory fields must not be empty
    Required: first_name, last_name, emp_id/email, role
    """
    required_fields = ["first_name", "last_name", "email", "role"]
    missing = [field for field in required_fields if not user_data.get(field)]
    if missing:
        return False, f"Missing mandatory fields: {', '.join(missing)}"
    return True, ""


def validate_br_sa_003_minimum_role(user: User) -> tuple[bool, str]:
    """
    BR-SA-003: User must have at least one active role
    """
    extra_info = getattr(user, 'extrainfo', None)
    if extra_info:
        active_roles = GlobalsHoldsDesignation.objects.filter(user=user).count()
        if active_roles == 0:
            return False, "User must have at least one active role"
    return True, ""


def validate_br_sa_004_role_constraints(user_type: str, designation: str, 
                                        department: str = None) -> tuple[bool, str]:
    """
    BR-SA-004: Role must match designation, qualification, and department
    """
    # Student cannot have faculty/staff roles
    faculty_only_roles = ["Dean", "Head of Department", "Professor", "Associate Professor"]
    if user_type == UserType.STUDENT and designation in faculty_only_roles:
        return False, f"Students cannot be assigned '{designation}' role"
    return True, ""


def check_br_sa_007_role_conflicts(user: User, new_designation: GlobalsDesignation) -> tuple[bool, str]:
    """
    BR-SA-007: Separation of Duties - check for conflicting roles
    """
    extra_info = getattr(user, 'extrainfo', None)
    if not extra_info:
        return True, ""
    
    current_designations = GlobalsHoldsDesignation.objects.filter(user=user).values_list('designation_id', flat=True)
    
    # Check if new designation conflicts with any current designation
    conflicts = RoleConflictMatrix.objects.filter(
        is_active=True,
        role1_id__in=current_designations,
        role2=new_designation
    ) | RoleConflictMatrix.objects.filter(
        is_active=True,
        role2_id__in=current_designations,
        role1=new_designation
    )
    
    if conflicts.exists():
        conflict_list = [f"{c.role1} ↔ {c.role2}" for c in conflicts]
        return False, f"Role conflict detected: {', '.join(conflict_list)}"
    
    return True, ""


def validate_br_sa_011_unique_user(email: str, user_id: str = None, 
                                   exclude_user: User = None) -> tuple[bool, str]:
    """
    BR-SA-011: Validate unique email and user ID
    """
    # Check email uniqueness
    email_exists = User.objects.filter(email=email)
    if exclude_user:
        email_exists = email_exists.exclude(pk=exclude_user.pk)
    if email_exists.exists():
        return False, f"Email '{email}' is already registered"
    
    # Check user ID uniqueness if provided
    if user_id:
        id_exists = GlobalsExtrainfo.objects.filter(user__username=user_id)
        if exclude_user:
            id_exists = id_exists.exclude(user=exclude_user)
        if id_exists.exists():
            return False, f"User ID '{user_id}' is already taken"
    
    return True, ""


# ═══════════════════════════════════════════════════════════════════════════════
# USE CASE IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════════════════════

# ── UC-014: Archive User/Data ─────────────────────────────────────────────────

def archive_user(user: User, archived_by: User, reason: str, 
                 retention_years: int = 3) -> dict:
    """
    Archive user data when employment ends or after inactivity
    BR-SA-005: Data archival triggers
    """
    from datetime import timedelta
    
    # Capture complete user data snapshot
    extra_info = getattr(user, 'extrainfo', None)
    user_data = {
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }
    
    if extra_info:
        user_data["extrainfo"] = {
            "user_type": extra_info.user_type,
            "user_status": extra_info.user_status,
            "title": extra_info.title,
            "sex": extra_info.sex,
            "date_of_birth": extra_info.date_of_birth.isoformat() if extra_info.date_of_birth else None,
            "phone_no": extra_info.phone_no,
            "address": extra_info.address,
            "about_me": extra_info.about_me,
            "department": extra_info.department.name if extra_info.department else None,
        }
    
    # Calculate retention period (3 years from now)
    retention_until = date.today() + timedelta(days=365 * retention_years)
    
    # Create archive record
    archive = ArchivedUserData.objects.create(
        original_user_id=user.id,
        user_data=user_data,
        archived_by=archived_by,
        archive_reason=reason,
        retention_until=retention_until
    )
    
    # Deactivate user (don't delete)
    user.is_active = False
    user.save()
    
    if extra_info:
        extra_info.user_status = UserStatus.ARCHIVED
        extra_info.save()
    
    # Log action
    _log_action("user_archived", archived_by, user, {
        "archive_id": archive.id,
        "reason": reason,
        "retention_until": retention_until.isoformat()
    })
    
    return {
        "success": True,
        "archive_id": archive.id,
        "message": f"User {user.username} archived successfully"
    }


# ── UC-015: Switch Role ────────────────────────────────────────────────────────

def switch_user_role(user: User, designation_id: int, request=None) -> dict:
    """
    Allow user to switch active role in the dashboard
    """
    extra_info = getattr(user, 'extrainfo', None)
    if not extra_info:
        return {"success": False, "error": "User profile not found"}
    
    # Verify user has this designation
    has_designation = GlobalsHoldsDesignation.objects.filter(
        user=user,
        designation_id=designation_id,
    ).exists()
    
    if not has_designation:
        return {"success": False, "error": "User does not have this role assigned"}
    
    # Update or create role session
    session, created = UserRoleSession.objects.update_or_create(
        user=user,
        defaults={
            "active_designation_id": designation_id,
            "session_data": {
                "switched_at": datetime.now().isoformat(),
                "previous_designation": None  # Could track history if needed
            }
        }
    )
    
    # Log role switch
    _log_action("role_switched", user, user, {
        "new_designation_id": designation_id
    }, request)
    
    return {
        "success": True,
        "message": "Role switched successfully",
        "active_role": designation_id
    }


def get_user_active_role(user: User) -> dict:
    """Get user's currently active role"""
    try:
        session = user.active_role_session
        return {
            "active_designation_id": session.active_designation_id,
            "active_designation_name": session.active_designation.name if session.active_designation else None,
            "switched_at": session.switched_at
        }
    except UserRoleSession.DoesNotExist:
        # Return first active designation if no session exists
        extra_info = getattr(user, 'extrainfo', None)
        first_role = GlobalsHoldsDesignation.objects.filter(user=user).select_related("designation").first()
        if first_role:
            return {
                "active_designation_id": first_role.designation_id,
                "active_designation_name": first_role.designation.name,
                "switched_at": None
            }
        return {"active_designation_id": None, "active_designation_name": None}


# ── UC-022: Emergency User Access ──────────────────────────────────────────────

def grant_emergency_access(user: User, granted_by: User, approver_name: str,
                           approver_designation: str, justification: str,
                           duration_hours: int = 24, request=None) -> dict:
    """
    Grant temporary emergency access to user
    BR-SA-009: Emergency access procedures
    """
    from datetime import timedelta
    
    expires_at = datetime.now() + timedelta(hours=duration_hours)
    
    emergency_access = EmergencyAccessLog.objects.create(
        user=user,
        requested_by=granted_by,
        granted_by=granted_by,
        status="approved",
        approver_name=approver_name,
        approver_designation=approver_designation,
        justification=justification,
        expires_at=expires_at,
        approved_end=expires_at,
        ip_address=_get_ip(request) if request else None
    )
    
    # Grant temporary superuser status
    user.is_superuser = True
    user.save()
    
    # Log with enhanced logging
    _log_action("emergency_access", granted_by, user, {
        "emergency_access_id": emergency_access.id,
        "approver": approver_name,
        "duration_hours": duration_hours,
        "expires_at": expires_at.isoformat(),
        "justification": justification
    }, request)
    
    return {
        "success": True,
        "emergency_access_id": emergency_access.id,
        "expires_at": expires_at,
        "message": f"Emergency access granted until {expires_at}"
    }


def create_emergency_request(
    user: User,
    requested_by: User,
    role: GlobalsDesignation,
    start_at: datetime | None,
    end_at: datetime | None,
    justification: str,
    request=None,
) -> dict:
    if not role:
        return {"success": False, "error": "Role is required"}

    if user == requested_by:
        requester_name = user.get_full_name() or user.username
    else:
        requester_name = requested_by.get_full_name() or requested_by.username

    access = EmergencyAccessLog.objects.create(
        user=user,
        requested_by=requested_by,
        requested_role=role,
        approver_name="",
        approver_designation="",
        justification=justification,
        requested_start=start_at,
        requested_end=end_at,
        expires_at=end_at or datetime.utcnow(),
        status="pending",
        is_active=False,
        ip_address=_get_ip(request) if request else None,
    )

    _log_action("emergency_access", requested_by, user, {
        "emergency_access_id": access.id,
        "status": "pending",
        "requested_role": role.name,
        "requested_start": start_at.isoformat() if start_at else None,
        "requested_end": end_at.isoformat() if end_at else None,
        "requested_by": requester_name,
    }, request)

    return {"success": True, "emergency_access_id": access.id}


def approve_emergency_request(
    access: EmergencyAccessLog,
    approved_by: User,
    role: GlobalsDesignation,
    start_at: datetime | None,
    end_at: datetime | None,
    decision_note: str = "",
    request=None,
) -> dict:
    if access.status != "pending":
        return {"success": False, "error": "Only pending requests can be approved"}

    if not role:
        return {"success": False, "error": "Role is required"}

    access.status = "approved"
    access.granted_by = approved_by
    access.approver_name = approved_by.get_full_name() or approved_by.username
    access.approver_designation = "System Admin"
    access.approved_role = role
    access.approved_start = start_at
    access.approved_end = end_at
    access.decision_note = decision_note or ""
    access.granted_at = datetime.utcnow()
    access.expires_at = end_at or access.expires_at
    access.is_active = True

    hold = add_holds_designation(access.user, role)
    access.hold = hold
    access.save()

    if normalize_role_name(role.name) == "superadmin":
        access.user.is_superuser = True
        access.user.save()

    _log_action("emergency_access", approved_by, access.user, {
        "emergency_access_id": access.id,
        "status": "approved",
        "approved_role": role.name,
        "approved_start": start_at.isoformat() if start_at else None,
        "approved_end": end_at.isoformat() if end_at else None,
    }, request)

    return {"success": True}


def decline_emergency_request(
    access: EmergencyAccessLog,
    declined_by: User,
    decision_note: str = "",
    request=None,
) -> dict:
    if access.status != "pending":
        return {"success": False, "error": "Only pending requests can be declined"}

    access.status = "declined"
    access.granted_by = declined_by
    access.approver_name = declined_by.get_full_name() or declined_by.username
    access.approver_designation = "System Admin"
    access.decision_note = decision_note or ""
    access.is_active = False
    access.save()

    _log_action("emergency_access", declined_by, access.user, {
        "emergency_access_id": access.id,
        "status": "declined",
    }, request)

    return {"success": True}


def revoke_emergency_access(emergency_access_id: int, revoked_by: User) -> dict:
    """Revoke emergency access before expiration"""
    try:
        access = EmergencyAccessLog.objects.get(id=emergency_access_id, is_active=True)
        access.is_active = False
        access.revoked_at = datetime.now()
        access.status = "revoked"
        access.save()
        
        # Remove superuser status for super admin temporary access
        role_name = (access.approved_role.name if access.approved_role else "")
        if normalize_role_name(role_name) == "superadmin":
            user = access.user
            user.is_superuser = False
            user.save()

        if access.hold_id:
            GlobalsHoldsDesignation.objects.filter(id=access.hold_id).delete()
        
        return {"success": True, "message": "Emergency access revoked"}
    except EmergencyAccessLog.DoesNotExist:
        return {"success": False, "error": "Emergency access not found or already revoked"}


def check_emergency_access_expired():
    """Background task to check and revoke expired emergency access"""
    expired = EmergencyAccessLog.objects.filter(
        is_active=True,
        expires_at__lt=datetime.now()
    )
    
    for access in expired:
        access.is_active = False
        access.status = "expired"
        access.save()
        
        # Remove superuser status for super admin temporary access
        role_name = (access.approved_role.name if access.approved_role else "")
        if normalize_role_name(role_name) == "superadmin":
            user = access.user
            user.is_superuser = False
            user.save()

        if access.hold_id:
            GlobalsHoldsDesignation.objects.filter(id=access.hold_id).delete()


def normalize_role_name(value: str) -> str:
    return "".join(ch for ch in (value or "").lower() if ch.isalnum())


# ── BR-SA-005: Automatic Data Archival ─────────────────────────────────────────

def check_and_archive_inactive_users(days_inactive: int = 1095) -> dict:
    """
    BR-SA-005: Archive users after 3 years (1095 days) of inactivity
    Should be run as a scheduled task (e.g., Celery beat, cron job)
    """
    from django.utils.timezone import now
    from datetime import timedelta
    
    cutoff_date = now() - timedelta(days=days_inactive)
    
    # Find users who haven't logged in for 3+ years and are still active
    inactive_users = User.objects.filter(
        is_active=True,
        last_login__lt=cutoff_date
    ).exclude(last_login=None)
    
    results = {
        "total_found": inactive_users.count(),
        "archived": [],
        "failed": []
    }
    
    for user in inactive_users:
        try:
            # Archive the user
            archive_result = archive_user(user, User.objects.filter(is_superuser=True).first(), 
                                         "Automatic archival: 3+ years of inactivity")
            
            if archive_result["success"]:
                results["archived"].append(user.username)
            else:
                results["failed"].append({"username": user.username, "error": archive_result.get("error")})
        except Exception as e:
            logger.error(f"Failed to archive user {user.username}: {str(e)}")
            results["failed"].append({"username": user.username, "error": str(e)})
    
    return results
