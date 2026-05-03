"""
Serializers for System Admin API.
Fixes applied:
  S6 - Explicit fields instead of __all__
  S13 - Consistent naming conventions
"""

from django.contrib.auth.models import User
import re
from rest_framework import serializers

from ..models import (
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


def _norm_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def _find_by_name_fuzzy(qs, fields: list[str], raw: str):
    target = _norm_token(raw)
    if not target:
        return None

    for obj in qs:
        for field in fields:
            field_val = getattr(obj, field, "")
            if _norm_token(field_val) == target:
                return obj
    return None


def _validate_gmail_address(raw_email: str):
    email = str(raw_email or "").strip().lower()
    if not email.endswith("@gmail.com"):
        raise serializers.ValidationError({"email": "Only @gmail.com email addresses are allowed."})


# ── Reference Data Serializers ────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalsDepartmentinfo
        fields = ["id", "name"]


class BatchSerializer(serializers.ModelSerializer):
    discipline_name = serializers.CharField(source="discipline.name", read_only=True)

    class Meta:
        model = Batch
        fields = ["id", "name", "year", "discipline", "discipline_name"]


class ProgrammeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Programme
        fields = ["id", "name", "category", "programme_begin_year"]


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalsDesignation
        fields = ["id", "name", "full_name", "type", "basic", "category", "dept_if_not_basic"]


# ── User Serializers ──────────────────────────────────────────────────────────

class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_active", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class ExtraInfoSerializer(serializers.ModelSerializer):
    user = AuthUserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = GlobalsExtrainfo
        fields = [
            "user",
            "user_type",
            "user_status",
            "title",
            "sex",
            "phone_no",
            "department",
            "date_modified",
        ]


class StudentInfoSerializer(serializers.ModelSerializer):
    user = ExtraInfoSerializer(read_only=True)
    batch = BatchSerializer(source="batch_id", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id",
            "user",
            "batch",
            "programme",
            "category",
            "curr_semester_no",
            "hall_no",
            "room_no",
            "specialization",
            "father_name",
            "mother_name",
        ]


class StudentDetailSerializer(serializers.ModelSerializer):
    """Detailed student serializer for User Directory"""
    id = serializers.IntegerField(source="id.user.id")
    username = serializers.CharField(source="id.user.username")
    first_name = serializers.CharField(source="id.user.first_name")
    last_name = serializers.CharField(source="id.user.last_name")
    email = serializers.CharField(source="id.user.email")
    status = serializers.CharField(source="id.user_status")
    gender = serializers.CharField(source="id.sex")
    programme = serializers.CharField()
    discipline = serializers.CharField(source="batch_id.discipline.name", default=None)
    batch = serializers.CharField(source="batch_id.name", default=None)
    batch_year = serializers.CharField(source="batch_id.year", default=None)
    category = serializers.CharField()
    semester = serializers.IntegerField(source="curr_semester_no")
    father_name = serializers.CharField()
    mother_name = serializers.CharField()

    class Meta:
        model = Student
        fields = ["id", "username", "first_name", "last_name", "email", "status", "gender",
                  "programme", "discipline", "batch", "batch_year", "category", "semester",
              "father_name", "mother_name"]


class FacultyDetailSerializer(serializers.ModelSerializer):
    """Detailed faculty serializer for User Directory"""
    id = serializers.IntegerField(source="id.user.id")
    username = serializers.CharField(source="id.user.username")
    first_name = serializers.CharField(source="id.user.first_name")
    last_name = serializers.CharField(source="id.user.last_name")
    email = serializers.CharField(source="id.user.email")
    status = serializers.CharField(source="id.user_status")
    gender = serializers.CharField(source="id.sex")
    title = serializers.CharField(source="id.title")
    department = serializers.CharField(source="id.department.name", default=None)
    designation = serializers.SerializerMethodField()

    class Meta:
        model = GlobalsFaculty
        fields = ["id", "username", "first_name", "last_name", "email", "status", "gender",
                  "title", "department", "designation"]

    def get_designation(self, obj):
        hold = GlobalsHoldsDesignation.objects.filter(user=obj.id.user).select_related("designation").first()
        return hold.designation.name if hold else None


class StaffDetailSerializer(serializers.ModelSerializer):
    """Detailed staff serializer for User Directory"""
    id = serializers.IntegerField(source="id.user.id")
    username = serializers.CharField(source="id.user.username")
    first_name = serializers.CharField(source="id.user.first_name")
    last_name = serializers.CharField(source="id.user.last_name")
    email = serializers.CharField(source="id.user.email")
    status = serializers.CharField(source="id.user_status")
    gender = serializers.CharField(source="id.sex")
    department = serializers.CharField(source="id.department.name", default=None)
    designation = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = ["id", "username", "first_name", "last_name", "email", "status", "gender",
                  "department", "designation"]

    def get_designation(self, obj):
        hold = GlobalsHoldsDesignation.objects.filter(user=obj.id.user).select_related("designation").first()
        return hold.designation.name if hold else None


class FacultyInfoSerializer(serializers.ModelSerializer):
    user = ExtraInfoSerializer(read_only=True)
    department = serializers.CharField(source="user.department.name", read_only=True)
    designation = serializers.SerializerMethodField()

    class Meta:
        model = GlobalsFaculty
        fields = ["id", "user", "department", "designation"]

    def get_designation(self, obj):
        hold = GlobalsHoldsDesignation.objects.filter(user=obj.id.user).select_related("designation").first()
        return DesignationSerializer(hold.designation).data if hold else None


class StaffInfoSerializer(serializers.ModelSerializer):
    user = ExtraInfoSerializer(read_only=True)
    department = serializers.CharField(source="user.department.name", read_only=True)
    designation = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = ["id", "user", "department", "designation"]

    def get_designation(self, obj):
        hold = GlobalsHoldsDesignation.objects.filter(user=obj.id.user).select_related("designation").first()
        return DesignationSerializer(hold.designation).data if hold else None


class HoldsDesignationSerializer(serializers.ModelSerializer):
    designation = DesignationSerializer(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = GlobalsHoldsDesignation
        fields = ["id", "username", "user_name", "designation", "held_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class RoleAssignmentSerializer(serializers.Serializer):
    """Serializer for role assignment with user details"""
    id = serializers.IntegerField(source="pk")
    user_id = serializers.IntegerField(source="user.id")
    user_name = serializers.SerializerMethodField()
    role = serializers.CharField(source="designation.name")
    held_at = serializers.DateTimeField()

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class ModuleAccessSerializer(serializers.Serializer):
    """Serializer for RBAC module access permissions"""
    module = serializers.CharField()
    view = serializers.BooleanField()
    create = serializers.BooleanField()
    edit = serializers.BooleanField()
    delete = serializers.BooleanField()


class RoleModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleModulePermission
        fields = ["module", "view", "create", "edit", "delete"]


class SystemRoleSerializer(serializers.ModelSerializer):
    permissions = RoleModulePermissionSerializer(source="module_permissions", many=True, read_only=True)

    class Meta:
        model = GlobalsDesignation
        fields = ["id", "name", "full_name", "type", "category", "basic", "permissions"]


class PermissionModuleSerializer(serializers.Serializer):
    module = serializers.CharField()
    view = serializers.BooleanField()
    create = serializers.BooleanField()
    edit = serializers.BooleanField()
    delete = serializers.BooleanField()


class ManageSystemRoleRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)

    permissions = PermissionModuleSerializer(many=True)

    def validate_permissions(self, value):
        if not value:
            raise serializers.ValidationError("At least one permission must be assigned.")
        return value


class UpdateSystemRoleRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    permissions = PermissionModuleSerializer(many=True, required=False)

    def validate_permissions(self, value):
        if value is not None and not value:
            raise serializers.ValidationError("At least one permission must be assigned.")
        return value


class StatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_users = serializers.IntegerField()
    active = serializers.IntegerField()
    inactive = serializers.IntegerField()
    archived = serializers.IntegerField()
    students = serializers.IntegerField()
    faculty = serializers.IntegerField()
    staff = serializers.IntegerField()


# ── Request Serializers (Input Validation) ────────────────────────────────────

class CreateStudentRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, required=False)
    phone_no = serializers.CharField(max_length=15, required=False, allow_blank=True)
    roll_number = serializers.CharField(max_length=20, required=False)
    batch_id = serializers.CharField(required=True)
    programme_id = serializers.CharField(required=True)
    category = serializers.ChoiceField(choices=["GEN", "OBC", "SC", "ST", "EWS"], default="GEN")
    semester = serializers.CharField(max_length=10, required=False, allow_blank=True)
    department_id = serializers.CharField(required=False, allow_blank=True)
    father_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    mother_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=["M", "F"], required=False)
    title = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate(self, data):
        """Validate unique email and username"""
        from django.contrib.auth.models import User

        _validate_gmail_address(data.get("email"))

        batch_raw = str(data.get("batch_id", "")).strip()
        batch = None
        if batch_raw.isdigit():
            batch = Batch.objects.filter(id=int(batch_raw)).first()
        if not batch:
            batch = Batch.objects.filter(name__iexact=batch_raw).order_by("-year").first()
        if not batch and batch_raw.isdigit():
            batch = Batch.objects.filter(year=int(batch_raw)).order_by("-year").first()
        if not batch:
            raise serializers.ValidationError({"batch_id": "Invalid batch. Use batch id, name, or year."})
        data["batch_id"] = batch.id

        programme_raw = str(data.get("programme_id", "")).strip()
        programme = None
        if programme_raw.isdigit():
            programme = Programme.objects.filter(id=int(programme_raw)).first()
        if not programme:
            programme = Programme.objects.filter(name__iexact=programme_raw).first()
        if not programme:
            programme = _find_by_name_fuzzy(Programme.objects.all(), ["name"], programme_raw)
        if not programme:
            raise serializers.ValidationError({"programme_id": "Invalid programme. Use programme id or name."})
        data["programme_id"] = programme.id

        department_raw = str(data.get("department_id", "")).strip()
        if department_raw:
            if department_raw.isdigit():
                department = GlobalsDepartmentinfo.objects.filter(id=int(department_raw)).first()
                if department:
                    data["department_id"] = department.name
            else:
                department = GlobalsDepartmentinfo.objects.filter(name__iexact=department_raw).first()
                if not department:
                    if not department:
                        department = _find_by_name_fuzzy(GlobalsDepartmentinfo.objects.all(), ["name"], department_raw)
                if department:
                    data["department_id"] = department.name
        
        # Check email uniqueness
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        
        # Check username uniqueness
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
        
        return data


class CreateFacultyRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, required=False)
    phone_no = serializers.CharField(max_length=15, required=False, allow_blank=True)
    department_id = serializers.CharField()
    designation_id = serializers.CharField()

    def validate(self, data):
        """Validate unique email and username"""
        from django.contrib.auth.models import User

        _validate_gmail_address(data.get("email"))

        department_raw = str(data.get("department_id", "")).strip()
        if department_raw:
            if department_raw.isdigit():
                department = GlobalsDepartmentinfo.objects.filter(id=int(department_raw)).first()
                if department:
                    data["department_id"] = department.name
            else:
                department = GlobalsDepartmentinfo.objects.filter(name__iexact=department_raw).first()
                if not department:
                    if not department:
                        department = _find_by_name_fuzzy(GlobalsDepartmentinfo.objects.all(), ["name"], department_raw)
                if department:
                    data["department_id"] = department.name

        designation_raw = str(data.get("designation_id", "")).strip()
        designation = None
        if designation_raw.isdigit():
            designation = GlobalsDesignation.objects.filter(id=int(designation_raw)).first()
        if not designation:
            designation = GlobalsDesignation.objects.filter(name__iexact=designation_raw).first()
        if not designation:
            designation = _find_by_name_fuzzy(GlobalsDesignation.objects.all(), ["name"], designation_raw)
        if not designation:
            raise serializers.ValidationError({"designation_id": "Invalid designation. Use designation id or name."})
        data["designation_id"] = designation.id
        
        # Check email uniqueness
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        
        # Check username uniqueness
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
        
        return data


class CreateStaffRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, required=False)
    phone_no = serializers.CharField(max_length=15, required=False, allow_blank=True)
    department_id = serializers.CharField()
    designation_id = serializers.CharField()

    def validate(self, data):
        """Validate unique email and username"""
        from django.contrib.auth.models import User

        _validate_gmail_address(data.get("email"))

        department_raw = str(data.get("department_id", "")).strip()
        if department_raw:
            if department_raw.isdigit():
                department = GlobalsDepartmentinfo.objects.filter(id=int(department_raw)).first()
                if department:
                    data["department_id"] = department.name
            else:
                department = GlobalsDepartmentinfo.objects.filter(name__iexact=department_raw).first()
                if not department:
                    if not department:
                        department = _find_by_name_fuzzy(GlobalsDepartmentinfo.objects.all(), ["name"], department_raw)
                if department:
                    data["department_id"] = department.name

        designation_raw = str(data.get("designation_id", "")).strip()
        designation = None
        if designation_raw.isdigit():
            designation = GlobalsDesignation.objects.filter(id=int(designation_raw)).first()
        if not designation:
            designation = GlobalsDesignation.objects.filter(name__iexact=designation_raw).first()
        if not designation:
            designation = _find_by_name_fuzzy(GlobalsDesignation.objects.all(), ["name"], designation_raw)
        if not designation:
            raise serializers.ValidationError({"designation_id": "Invalid designation. Use designation id or name."})
        data["designation_id"] = designation.id
        
        # Check email uniqueness
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        
        # Check username uniqueness
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
        
        return data


class UserStatusUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)


class AssignRoleSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    designation_id = serializers.IntegerField()
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)


class ReassignRoleSerializer(serializers.Serializer):
    hold_id = serializers.IntegerField()
    new_designation_id = serializers.IntegerField()


class PasswordResetSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    new_password = serializers.CharField(min_length=8)


class BulkCreateUsersRequestSerializer(serializers.Serializer):
    user_type = serializers.ChoiceField(choices=["student", "faculty", "staff"])
    users = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate_users(self, value):
        if len(value) > 200:
            raise serializers.ValidationError("Maximum 200 users can be created in one request.")
        return value


# ── Audit Log Serializer ──────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = serializers.CharField(source="performed_by.username", read_only=True)
    target_user = serializers.CharField(source="target_user.username", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ["id", "action", "performed_by", "target_user", "details", "timestamp", "ip_address"]
