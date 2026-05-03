"""
Selectors for System Admin Module.
All database queries centralized here per audit fix S2.
No business logic should live in selectors.
"""

from django.contrib.auth.models import User
from django.db.models import Q, Prefetch

from .models import (
    GlobalsExtrainfo,
    GlobalsDepartmentinfo,
    Programme,
    Batch,
    GlobalsDesignation,
    GlobalsHoldsDesignation,
    Student,
    GlobalsFaculty,
    Staff,
    AuditLog,
    RoleModulePermission,
)
from .constants import DEFAULT_DEPARTMENT


# ── Department Selectors ──────────────────────────────────────────────────────

def get_all_departments():
    return GlobalsDepartmentinfo.objects.all().order_by("name")


def get_department_by_name(name: str):
    return GlobalsDepartmentinfo.objects.filter(name=name).first()


def get_default_department():
    """Returns default department (CSE). Cached at module level to avoid N+1 queries."""
    return GlobalsDepartmentinfo.objects.filter(name=DEFAULT_DEPARTMENT).first()


# ── Batch Selectors ───────────────────────────────────────────────────────────

def get_all_batches():
    return Batch.objects.select_related("discipline").all().order_by("-year")


def get_batch_by_id(batch_id: int):
    return Batch.objects.filter(id=batch_id).first()


# ── Programme Selectors ───────────────────────────────────────────────────────

def get_all_programmes():
    return Programme.objects.all().order_by("name")


def get_programme_by_id(prog_id: int):
    return Programme.objects.filter(id=prog_id).first()


# ── Designation Selectors ─────────────────────────────────────────────────────

def get_all_designations():
    return GlobalsDesignation.objects.all().order_by("name")


def get_designation_by_id(designation_id: int):
    return GlobalsDesignation.objects.filter(id=designation_id).first()


def get_designation_by_name(name: str):
    return GlobalsDesignation.objects.filter(name=name).first()


def get_system_roles():
    return GlobalsDesignation.objects.prefetch_related("module_permissions").all().order_by("name")


def get_system_role_by_id(role_id: int):
    return GlobalsDesignation.objects.prefetch_related("module_permissions").filter(id=role_id).first()


def get_role_permissions(role: GlobalsDesignation):
    return RoleModulePermission.objects.filter(designation=role).order_by("module")


# ── User Selectors ────────────────────────────────────────────────────────────

def get_all_users_with_info():
    return (
        GlobalsExtrainfo.objects
        .select_related("user", "department")
        .all()
        .order_by("user__username")
    )


def get_users_by_type(user_type: str):
    return (
        GlobalsExtrainfo.objects
        .filter(user_type=user_type)
        .select_related("user", "department")
        .order_by("user__username")
    )


def get_user_by_username(username: str):
    return (
        GlobalsExtrainfo.objects
        .select_related("user", "department")
        .filter(user__username=username)
        .first()
    )


def get_user_by_id(user_id: int):
    return (
        GlobalsExtrainfo.objects
        .select_related("user", "department")
        .filter(user__id=user_id)
        .first()
    )


def search_users(query: str):
    return (
        GlobalsExtrainfo.objects
        .select_related("user", "department")
        .filter(
            Q(user__username__icontains=query)
            | Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(user__email__icontains=query)
        )
        .order_by("user__username")
    )


# ── Role / Designation Selectors ──────────────────────────────────────────────

def get_roles_for_user(extra_info: GlobalsExtrainfo):
    return (
        GlobalsHoldsDesignation.objects
        .filter(user=extra_info.user)
        .select_related("designation")
        .order_by("-held_at")
    )


def get_active_roles_for_user(extra_info: GlobalsExtrainfo):
    return (
        GlobalsHoldsDesignation.objects
        .filter(user=extra_info.user)
        .select_related("designation")
    )


def get_holds_designation_by_id(hold_id: int):
    return (
        GlobalsHoldsDesignation.objects
        .select_related("user", "designation")
        .filter(id=hold_id)
        .first()
    )


def get_role_by_username(username: str):
    return (
        GlobalsHoldsDesignation.objects
        .filter(user__username=username)
        .select_related("user", "designation")
    )


# ── Audit Log Selectors ───────────────────────────────────────────────────────

def get_audit_logs(filters: dict = None):
    qs = AuditLog.objects.select_related("performed_by", "target_user").all()
    if filters:
        if filters.get("action"):
            qs = qs.filter(action=filters["action"])
        if filters.get("performed_by"):
            qs = qs.filter(performed_by__username=filters["performed_by"])
        if filters.get("target_user"):
            qs = qs.filter(target_user__username=filters["target_user"])
        if filters.get("date_from"):
            qs = qs.filter(timestamp__date__gte=filters["date_from"])
        if filters.get("date_to"):
            qs = qs.filter(timestamp__date__lte=filters["date_to"])
    return qs.order_by("-timestamp")


# ── Filtered User Selectors for User Directory ─────────────────────────────────

def get_students_with_filters(filters: dict = None, query: str = None):
    """Get students with optional filters and search query"""
    qs = Student.objects.select_related(
        "id",
        "id__user",
        "batch_id",
        "batch_id__discipline",
    ).all()

    if query:
        qs = qs.filter(
            Q(id__user__username__icontains=query)
            | Q(id__user__first_name__icontains=query)
            | Q(id__user__last_name__icontains=query)
        )

    if filters:
        if filters.get("programme"):
            qs = qs.filter(programme__in=filters["programme"])
        if filters.get("discipline"):
            qs = qs.filter(batch_id__discipline__name__in=filters["discipline"])
        if filters.get("batch"):
            qs = qs.filter(batch_id__year__in=filters["batch"])
        if filters.get("semester"):
            qs = qs.filter(curr_semester_no__in=filters["semester"])
        if filters.get("category"):
            qs = qs.filter(category__in=filters["category"])
        if filters.get("gender"):
            qs = qs.filter(id__sex__in=filters["gender"])

    return qs.order_by("id__user__username")


def get_faculty_with_filters(filters: dict = None, query: str = None):
    """Get faculty with optional filters and search query"""
    qs = GlobalsFaculty.objects.select_related(
        "id",
        "id__user",
        "id__department",
    ).all()

    if query:
        qs = qs.filter(
            Q(id__user__username__icontains=query)
            | Q(id__user__first_name__icontains=query)
            | Q(id__user__last_name__icontains=query)
        )

    if filters:
        if filters.get("dept"):
            qs = qs.filter(id__department__name__in=filters["dept"])
        if filters.get("desig"):
            desig_users = GlobalsHoldsDesignation.objects.filter(
                designation__name__in=filters["desig"]
            ).values_list("user_id", flat=True)
            qs = qs.filter(id__user_id__in=desig_users)
        if filters.get("gender"):
            qs = qs.filter(id__sex__in=filters["gender"])

    return qs.order_by("id__user__username")


def get_staff_with_filters(filters: dict = None, query: str = None):
    """Get staff with optional filters and search query"""
    qs = Staff.objects.select_related(
        "id",
        "id__user",
        "id__department",
    ).all()

    if query:
        qs = qs.filter(
            Q(id__user__username__icontains=query)
            | Q(id__user__first_name__icontains=query)
            | Q(id__user__last_name__icontains=query)
        )

    if filters:
        if filters.get("dept"):
            qs = qs.filter(id__department__name__in=filters["dept"])
        if filters.get("desig"):
            desig_users = GlobalsHoldsDesignation.objects.filter(
                designation__name__in=filters["desig"]
            ).values_list("user_id", flat=True)
            qs = qs.filter(id__user_id__in=desig_users)
        if filters.get("gender"):
            qs = qs.filter(id__sex__in=filters["gender"])

    return qs.order_by("id__user__username")


def get_all_role_assignments():
    """Get all role assignments with user and designation info"""
    return GlobalsHoldsDesignation.objects.select_related(
        "user", "designation"
    ).order_by("-held_at")


def get_user_stats():
    """Get user statistics for dashboard"""
    from django.db.models import Count, Q

    stats = GlobalsExtrainfo.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(user_status="active")),
        inactive=Count("id", filter=Q(user_status="inactive")),
        archived=Count("id", filter=Q(user_status="archived")),
        students=Count("id", filter=Q(user_type="student")),
        faculty=Count("id", filter=Q(user_type="faculty")),
        staff=Count("id", filter=Q(user_type="staff")),
    )
    return stats
