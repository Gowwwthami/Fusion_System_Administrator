"""
API Views for System Admin Module.
Fixes applied:
  S4  - Views are thin; business logic in services.py
  S7  - Specific exception handling (no bare except)
  S10 - All endpoints have @permission_classes
  S11 - Serializer-validated input
  S12 - select_related/prefetch_related via selectors
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from .. import selectors, services
from ..models import Batch, Programme, GlobalsHoldsDesignation, GlobalsFaculty, Staff, EmergencyAccessLog, GlobalsDesignation
from ..permissions import IsSuperAdminRole
from .serializers import (
    DepartmentSerializer,
    BatchSerializer,
    ProgrammeSerializer,
    DesignationSerializer,
    ExtraInfoSerializer,
    HoldsDesignationSerializer,
    AuditLogSerializer,
    CreateStudentRequestSerializer,
    CreateFacultyRequestSerializer,
    CreateStaffRequestSerializer,
    UserStatusUpdateSerializer,
    AssignRoleSerializer,
    ReassignRoleSerializer,
    PasswordResetSerializer,
    BulkCreateUsersRequestSerializer,
    StudentDetailSerializer,
    FacultyDetailSerializer,
    StaffDetailSerializer,
    RoleAssignmentSerializer,
    ModuleAccessSerializer,
    StatsSerializer,
    SystemRoleSerializer,
    ManageSystemRoleRequestSerializer,
    UpdateSystemRoleRequestSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Reference Data ────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def departments(request):
    qs = selectors.get_all_departments()
    return Response(DepartmentSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def batches(request):
    qs = selectors.get_all_batches()
    return Response(BatchSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def programmes(request):
    qs = selectors.get_all_programmes()
    return Response(ProgrammeSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_designations(request):
    qs = selectors.get_all_designations()
    return Response(DesignationSerializer(qs, many=True).data)


# ── User Management ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    user_type = request.query_params.get("user_type")
    query = request.query_params.get("q")

    if query:
        qs = selectors.search_users(query)
    elif user_type:
        qs = selectors.get_users_by_type(user_type)
    else:
        qs = selectors.get_all_users_with_info()

    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(ExtraInfoSerializer(page, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def add_student(request):
    serializer = CreateStudentRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "add_student"), status=status.HTTP_400_BAD_REQUEST)

    result = services.create_student(serializer.validated_data, request.user)
    if not result["success"]:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def add_faculty(request):
    serializer = CreateFacultyRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "add_faculty"), status=status.HTTP_400_BAD_REQUEST)

    result = services.create_faculty(serializer.validated_data, request.user)
    if not result["success"]:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def add_staff(request):
    serializer = CreateStaffRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "add_staff"), status=status.HTTP_400_BAD_REQUEST)

    result = services.create_staff(serializer.validated_data, request.user)
    if not result["success"]:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def bulk_create_users(request):
    serializer = BulkCreateUsersRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "bulk_create_users"), status=status.HTTP_400_BAD_REQUEST)

    user_type = serializer.validated_data["user_type"]
    users = serializer.validated_data["users"]

    row_serializer_map = {
        "student": CreateStudentRequestSerializer,
        "faculty": CreateFacultyRequestSerializer,
        "staff": CreateStaffRequestSerializer,
    }
    row_serializer_cls = row_serializer_map[user_type]

    validated_users = []
    failed = []
    for index, row in enumerate(users, start=1):
        row_serializer = row_serializer_cls(data=row)
        if row_serializer.is_valid():
            validated_users.append(row_serializer.validated_data)
        else:
            failed.append({
                "index": index,
                "username": row.get("username"),
                "error": row_serializer.errors,
            })

    result = services.bulk_create_users(validated_users, user_type, request.user)
    if failed:
        result.setdefault("results", {}).setdefault("failed", []).extend(failed)

    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_user(request):
    serializer = UserStatusUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer), status=status.HTTP_400_BAD_REQUEST)

    result = services.activate_user(serializer.validated_data["username"], request.user)
    code = status.HTTP_200_OK if result["success"] else status.HTTP_404_NOT_FOUND
    return Response(result, status=code)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_user(request):
    serializer = UserStatusUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer), status=status.HTTP_400_BAD_REQUEST)

    result = services.deactivate_user(serializer.validated_data["username"], request.user)
    code = status.HTTP_200_OK if result["success"] else status.HTTP_404_NOT_FOUND
    return Response(result, status=code)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def archive_user(request):
    """Archive a user account"""
    username = request.data.get("username")
    user_id = request.data.get("user_id")
    
    from django.contrib.auth.models import User
    
    try:
        if user_id:
            user = User.objects.get(id=user_id)
        elif username:
            user = User.objects.get(username=username)
        else:
            return Response({"error": "username or user_id required"}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    reason = request.data.get("reason", "No reason provided")
    retention_years = request.data.get("retention_years", 3)
    
    result = services.archive_user(user, request.user, reason, retention_years)
    
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reset_password(request):
    serializer = PasswordResetSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer), status=status.HTTP_400_BAD_REQUEST)

    result = services.reset_password(
        serializer.validated_data["username"],
        serializer.validated_data["new_password"],
        request.user,
    )
    code = status.HTTP_200_OK if result["success"] else status.HTTP_404_NOT_FOUND
    return Response(result, status=code)


# ── User Directory (Filtered Lists) ───────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_students(request):
    """List students with filters"""
    query = request.query_params.get("q")
    filters = {
        "programme": request.query_params.getlist("programme"),
        "discipline": request.query_params.getlist("discipline"),
        "batch": request.query_params.getlist("batch"),
        "semester": request.query_params.getlist("semester"),
        "category": request.query_params.getlist("category"),
        "gender": request.query_params.getlist("gender"),
    }
    # Remove empty filters
    filters = {k: v for k, v in filters.items() if v}

    qs = selectors.get_students_with_filters(filters if filters else None, query)
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(StudentDetailSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_faculty(request):
    """List faculty with filters"""
    query = request.query_params.get("q")
    filters = {
        "dept": request.query_params.getlist("dept"),
        "desig": request.query_params.getlist("desig"),
        "gender": request.query_params.getlist("gender"),
    }
    filters = {k: v for k, v in filters.items() if v}

    qs = selectors.get_faculty_with_filters(filters if filters else None, query)
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(FacultyDetailSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_staff(request):
    """List staff with filters"""
    query = request.query_params.get("q")
    filters = {
        "dept": request.query_params.getlist("dept"),
        "desig": request.query_params.getlist("desig"),
        "gender": request.query_params.getlist("gender"),
    }
    filters = {k: v for k, v in filters.items() if v}

    qs = selectors.get_staff_with_filters(filters if filters else None, query)
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(StaffDetailSerializer(page, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_directory_filters(request):
    programmes = list(Programme.objects.order_by("name").values_list("name", flat=True))
    disciplines = list(
        Batch.objects
        .select_related("discipline")
        .values_list("discipline__name", flat=True)
        .exclude(discipline__name__isnull=True)
        .distinct()
    )
    batches = list(Batch.objects.order_by("-year").values_list("year", flat=True).distinct())

    faculty_departments = list(
        GlobalsFaculty.objects
        .select_related("id__department")
        .values_list("id__department__name", flat=True)
        .exclude(id__department__name__isnull=True)
        .distinct()
    )
    staff_departments = list(
        Staff.objects
        .select_related("id__department")
        .values_list("id__department__name", flat=True)
        .exclude(id__department__name__isnull=True)
        .distinct()
    )

    faculty_designations = list(
        GlobalsHoldsDesignation.objects
        .filter(user__extrainfo__user_type="faculty")
        .values_list("designation__name", flat=True)
        .distinct()
    )
    staff_designations = list(
        GlobalsHoldsDesignation.objects
        .filter(user__extrainfo__user_type="staff")
        .values_list("designation__name", flat=True)
        .distinct()
    )

    payload = {
        "students": {
            "programme": programmes,
            "discipline": disciplines,
            "batch": [str(b) for b in batches if b is not None],
        },
        "faculty": {
            "dept": faculty_departments,
            "desig": faculty_designations,
        },
        "staff": {
            "dept": staff_departments,
            "desig": staff_designations,
        },
    }
    return Response(payload)


# ── Role Management ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_roles(request):
    username = request.query_params.get("username")
    if not username:
        return Response({"error": "username query param required"}, status=status.HTTP_400_BAD_REQUEST)

    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    roles = selectors.get_roles_for_user(extra_info)
    return Response(HoldsDesignationSerializer(roles, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_assignable_roles(request):
    username = request.query_params.get("username")
    if not username:
        return Response({"error": "username query param required"}, status=status.HTTP_400_BAD_REQUEST)

    extra_info = selectors.get_user_by_username(username)
    if not extra_info:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    roles = services.get_assignable_roles_for_user(extra_info)
    return Response(DesignationSerializer(roles, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_role_assignments(request):
    """List all role assignments"""
    qs = selectors.get_all_role_assignments()
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = RoleAssignmentSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET", "POST"])
@permission_classes([IsSuperAdminRole])
def manage_system_roles(request):
    """SA-UC-020: Create and list system roles with permissions."""
    if request.method == "GET":
        roles = selectors.get_system_roles()
        return Response(SystemRoleSerializer(roles, many=True).data)

    serializer = ManageSystemRoleRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "manage_system_roles"), status=status.HTTP_400_BAD_REQUEST)

    result = services.create_system_role(serializer.validated_data, request.user)
    code = status.HTTP_201_CREATED if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=code)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def available_permission_modules(request):
    return Response(services.get_available_permission_modules())


@api_view(["PUT", "PATCH"])
@permission_classes([IsSuperAdminRole])
def modify_system_role(request, role_id: int):
    """SA-UC-020: Modify role details and permissions."""
    serializer = UpdateSystemRoleRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer, "modify_system_role"), status=status.HTTP_400_BAD_REQUEST)

    result = services.update_system_role(role_id, serializer.validated_data, request.user)
    code = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=code)


@api_view(["PATCH", "POST"])
@permission_classes([IsSuperAdminRole])
def deactivate_system_role(request, role_id: int):
    """SA-UC-020: Deactivate a role and revoke active assignments."""
    result = services.deactivate_system_role(role_id, request.user)
    code = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=code)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_system_roles(request):
    roles = selectors.get_system_roles()
    return Response(SystemRoleSerializer(roles, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_module_access(request):
    """Get module access permissions for a role"""
    role_name = request.query_params.get("role")
    if not role_name:
        return Response({"error": "role query param required"}, status=status.HTTP_400_BAD_REQUEST)

    permissions = services.get_module_access_for_role(role_name)
    return Response(ModuleAccessSerializer(permissions, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def assign_role(request):
    serializer = AssignRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer), status=status.HTTP_400_BAD_REQUEST)

    force = request.data.get("force", False)
    result = services.assign_role(serializer.validated_data, request.user, force=force)
    code = status.HTTP_201_CREATED if result["success"] else status.HTTP_400_BAD_REQUEST
    return Response(result, status=code)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def reassign_role(request):
    serializer = ReassignRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(services.handle_serializer_error(serializer), status=status.HTTP_400_BAD_REQUEST)

    result = services.reassign_role(
        serializer.validated_data["hold_id"],
        serializer.validated_data["new_designation_id"],
        request.user,
    )
    code = status.HTTP_200_OK if result["success"] else status.HTTP_404_NOT_FOUND
    return Response(result, status=code)


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def revoke_role(request, hold_id: int):
    result = services.revoke_role(hold_id, request.user)
    code = status.HTTP_200_OK if result["success"] else status.HTTP_404_NOT_FOUND
    return Response(result, status=code)


# ── Bulk Import / Export ──────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminUser])
def import_users(request):
    csv_file = request.FILES.get("file")
    user_type = request.data.get("user_type", "student")

    if not csv_file:
        return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        content = csv_file.read().decode("utf-8")
    except UnicodeDecodeError:
        return Response({"error": "File must be UTF-8 encoded CSV"}, status=status.HTTP_400_BAD_REQUEST)

    result = services.bulk_import_users(content, user_type, request.user)
    return Response(result, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def export_users(request):
    import csv
    import io
    from django.http import HttpResponse

    user_type = request.query_params.get("user_type")
    qs = selectors.get_users_by_type(user_type) if user_type else selectors.get_all_users_with_info()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["username", "first_name", "last_name", "email", "user_type", "user_status", "department"])
    for info in qs:
        writer.writerow([
            info.user.username,
            info.user.first_name,
            info.user.last_name,
            info.user.email,
            info.user_type,
            info.user_status,
            info.department.name if info.department else "",
        ])

    response = HttpResponse(output.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="users_export.csv"'
    return response


# ── Audit Logs ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def audit_logs(request):
    filters = {
        "action": request.query_params.get("action"),
        "performed_by": request.query_params.get("performed_by"),
        "target_user": request.query_params.get("target_user"),
        "date_from": request.query_params.get("date_from"),
        "date_to": request.query_params.get("date_to"),
    }
    qs = selectors.get_audit_logs({k: v for k, v in filters.items() if v})
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


# ── Stats ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_stats(request):
    """Get user statistics for dashboard"""
    stats = selectors.get_user_stats()
    return Response(StatsSerializer(stats).data)


# ── Mail Batch ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminUser])
def mail_batch(request):
    """
    Generate passwords and send emails to all users in a batch.
    Request body: { "batch_year": "2023" }
    """
    batch_year = request.data.get("batch_year")
    if not batch_year:
        return Response(
            {"error": "batch_year is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = services.mail_batch_passwords(batch_year, request.user)
    return Response(result, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════════════
# NEW USE CASE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ── UC-014: Archived Users List ────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_archived_users(request):
    """List all archived users"""
    from ..models import ArchivedUserData
    
    archives = ArchivedUserData.objects.all()
    data = [{
        "id": a.id,
        "original_user_id": a.original_user_id,
        "archived_by": a.archived_by.username if a.archived_by else None,
        "archived_at": a.archived_at,
        "archive_reason": a.archive_reason,
        "retention_until": a.retention_until,
        "is_restored": a.is_restored,
        "user_data": a.user_data
    } for a in archives]
    
    return Response(data)


# ── UC-015: Switch Role ────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def switch_role(request):
    """Switch user's active role"""
    designation_id = request.data.get("designation_id")
    if not designation_id:
        return Response(
            {"error": "designation_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    result = services.switch_user_role(request.user, designation_id, request)
    
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_active_role(request):
    """Get user's currently active role"""
    result = services.get_user_active_role(request.user)
    return Response(result)


# ── UC-022: Emergency Access ───────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminUser])
def grant_emergency_access(request):
    """Grant emergency access to a user"""
    user_id = request.data.get("user_id")
    approver_name = request.data.get("approver_name")
    approver_designation = request.data.get("approver_designation")
    justification = request.data.get("justification")
    duration_hours = request.data.get("duration_hours", 24)
    
    if not all([user_id, approver_name, approver_designation, justification]):
        return Response(
            {"error": "user_id, approver_name, approver_designation, and justification are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from django.contrib.auth.models import User
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    result = services.grant_emergency_access(
        user, request.user, approver_name, approver_designation,
        justification, duration_hours, request
    )
    
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def revoke_emergency_access(request, access_id):
    """Revoke emergency access"""
    result = services.revoke_emergency_access(access_id, request.user)
    
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def request_emergency_access(request):
    """Create an emergency access request for review"""
    user_id = request.data.get("user_id")
    role_id = request.data.get("role_id")
    start_at = request.data.get("start_at")
    end_at = request.data.get("end_at")
    justification = request.data.get("justification")

    if not all([user_id, role_id, end_at, justification]):
        return Response(
            {"error": "user_id, role_id, end_at, and justification are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth.models import User
    from django.utils.dateparse import parse_datetime

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    extra = selectors.get_user_by_id(user.id)
    if extra and extra.user_type == "student":
        return Response({"error": "Emergency access cannot be granted to students"}, status=status.HTTP_400_BAD_REQUEST)

    role = None
    if str(role_id).lower() == "super_admin":
        role, _ = GlobalsDesignation.objects.get_or_create(
            name="Super Admin",
            defaults={"full_name": "Super Admin", "type": "system", "basic": False, "category": "system"},
        )
    else:
        role = GlobalsDesignation.objects.filter(id=role_id).first()
    if not role:
        return Response({"error": "Role not found"}, status=status.HTTP_400_BAD_REQUEST)

    start_dt = parse_datetime(start_at) if start_at else None
    end_dt = parse_datetime(end_at) if end_at else None
    if not end_dt:
        return Response({"error": "Invalid end_at"}, status=status.HTTP_400_BAD_REQUEST)
    if start_dt and end_dt <= start_dt:
        return Response({"error": "end_at must be after start_at"}, status=status.HTTP_400_BAD_REQUEST)

    result = services.create_emergency_request(
        user,
        request.user,
        role,
        start_dt,
        end_dt,
        justification,
        request,
    )
    if result["success"]:
        return Response(result, status=status.HTTP_201_CREATED)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_emergency_access(request, access_id):
    """Approve a pending emergency access request"""
    role_id = request.data.get("role_id")
    start_at = request.data.get("start_at")
    end_at = request.data.get("end_at")
    decision_note = request.data.get("decision_note", "")

    from django.utils.dateparse import parse_datetime

    access = EmergencyAccessLog.objects.filter(id=access_id).first()
    if not access:
        return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

    role = None
    if str(role_id).lower() == "super_admin":
        role, _ = GlobalsDesignation.objects.get_or_create(
            name="Super Admin",
            defaults={"full_name": "Super Admin", "type": "system", "basic": False, "category": "system"},
        )
    else:
        role = GlobalsDesignation.objects.filter(id=role_id).first()
    if not role:
        return Response({"error": "Role not found"}, status=status.HTTP_400_BAD_REQUEST)

    start_dt = parse_datetime(start_at) if start_at else None
    end_dt = parse_datetime(end_at) if end_at else None
    if not end_dt:
        return Response({"error": "Invalid end_at"}, status=status.HTTP_400_BAD_REQUEST)
    if start_dt and end_dt <= start_dt:
        return Response({"error": "end_at must be after start_at"}, status=status.HTTP_400_BAD_REQUEST)

    result = services.approve_emergency_request(
        access,
        request.user,
        role,
        start_dt,
        end_dt,
        decision_note,
        request,
    )
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def decline_emergency_access(request, access_id):
    """Decline a pending emergency access request"""
    decision_note = request.data.get("decision_note", "")
    access = EmergencyAccessLog.objects.filter(id=access_id).first()
    if not access:
        return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

    result = services.decline_emergency_request(
        access,
        request.user,
        decision_note,
        request,
    )
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_emergency_accesses(request):
    """List all emergency access grants"""
    accesses = EmergencyAccessLog.objects.all()
    data = [{
        "id": a.id,
        "user": a.user.username,
        "requested_by": a.requested_by.username if a.requested_by else None,
        "granted_by": a.granted_by.username if a.granted_by else None,
        "approver_name": a.approver_name,
        "approver_designation": a.approver_designation,
        "justification": a.justification,
        "requested_role": a.requested_role.name if a.requested_role else None,
        "requested_role_id": a.requested_role.id if a.requested_role else None,
        "approved_role": a.approved_role.name if a.approved_role else None,
        "approved_role_id": a.approved_role.id if a.approved_role else None,
        "requested_start": a.requested_start,
        "requested_end": a.requested_end,
        "approved_start": a.approved_start,
        "approved_end": a.approved_end,
        "granted_at": a.granted_at,
        "expires_at": a.expires_at,
        "is_active": a.is_active,
        "revoked_at": a.revoked_at,
        "status": a.status,
        "decision_note": a.decision_note,
    } for a in accesses]
    
    return Response(data)


# ── Business Rule Validation Endpoints ─────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminUser])
def validate_role_assignment(request):
    """Validate role assignment against business rules"""
    user_id = request.data.get("user_id")
    designation_id = request.data.get("designation_id")
    
    if not all([user_id, designation_id]):
        return Response(
            {"error": "user_id and designation_id are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from django.contrib.auth.models import User
    from ..models import GlobalsDesignation
    
    try:
        user = User.objects.get(id=user_id)
        designation = GlobalsDesignation.objects.get(id=designation_id)
    except (User.DoesNotExist, GlobalsDesignation.DoesNotExist):
        return Response({"error": "User or designation not found"}, status=status.HTTP_404_NOT_FOUND)
    
    extra_info = getattr(user, 'extrainfo', None)
    user_type = extra_info.user_type if extra_info else None
    
    validations = []
    
    # BR-SA-001: Eligibility
    is_valid, msg = services.validate_br_sa_001_eligibility(user_type, designation.name)
    validations.append({"rule": "BR-SA-001", "passed": is_valid, "message": msg})
    
    # BR-SA-004: Role constraints
    is_valid, msg = services.validate_br_sa_004_role_constraints(user_type, designation.name)
    validations.append({"rule": "BR-SA-004", "passed": is_valid, "message": msg})
    
    # BR-SA-007: Role conflicts
    is_valid, msg = services.check_br_sa_007_role_conflicts(user, designation)
    validations.append({"rule": "BR-SA-007", "passed": is_valid, "message": msg})
    
    all_passed = all(v["passed"] for v in validations)
    
    return Response({
        "valid": all_passed,
        "validations": validations
    })


# ── UC-007: Department Hierarchy ───────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def department_hierarchy(request):
    """Get department hierarchy structure"""
    dept_id = request.query_params.get("department")
    result = services.get_department_hierarchy(dept_id)
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def assign_department_head(request):
    """Assign Head of Department"""
    department_id = request.data.get("department_id")
    user_id = request.data.get("user_id")
    
    if not all([department_id, user_id]):
        return Response(
            {"error": "department_id and user_id are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    result = services.assign_department_head(department_id, user_id, request.user)
    
    if result["success"]:
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_400_BAD_REQUEST)
