import datetime

from django.db import models
from django.contrib.auth.models import User


class UserType(models.TextChoices):
    STUDENT = "student", "Student"
    FACULTY = "faculty", "Faculty"
    STAFF = "staff", "Staff"


class UserStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    ARCHIVED = "archived", "Archived"


class Programme(models.Model):
    category = models.CharField(max_length=3)
    name = models.CharField(max_length=70, unique=True)
    programme_begin_year = models.PositiveIntegerField(
        default=datetime.date.today().year,
    )

    class Meta:
        db_table = "programme_curriculum_programme"

    def __str__(self):
        return f"{self.category} - {self.name}"


class Discipline(models.Model):
    name = models.CharField(max_length=100, unique=True)
    acronym = models.CharField(max_length=10, default="")
    programmes = models.ManyToManyField(Programme, blank=True)

    class Meta:
        db_table = "programme_curriculum_discipline"

    def __str__(self):
        return f"{self.name} {self.acronym}".strip()


class Curriculum(models.Model):
    programme = models.ForeignKey(Programme, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    version = models.DecimalField(default=1.0, max_digits=5, decimal_places=1)
    working_curriculum = models.BooleanField(default=True)
    no_of_semester = models.PositiveIntegerField(default=1)
    min_credit = models.PositiveIntegerField(default=0)
    latest_version = models.BooleanField(default=True)

    class Meta:
        unique_together = ("name", "version")
        db_table = "programme_curriculum_curriculum"

    def __str__(self):
        return f"{self.name} v{self.version}"


class Batch(models.Model):
    name = models.CharField(max_length=50)
    discipline = models.ForeignKey(Discipline, on_delete=models.CASCADE)
    year = models.PositiveIntegerField(default=datetime.date.today().year)
    curriculum = models.ForeignKey(Curriculum, null=True, blank=True, on_delete=models.SET_NULL)
    running_batch = models.BooleanField(default=True)

    class Meta:
        unique_together = ("name", "discipline", "year")
        db_table = "programme_curriculum_batch"

    def __str__(self):
        return f"{self.name} {self.discipline.acronym} {self.year}".strip()


class GlobalsDepartmentinfo(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "globals_departmentinfo"

    def __str__(self):
        return self.name


class GlobalsDesignation(models.Model):
    name = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=100, default="", blank=True)
    type = models.CharField(max_length=30, default="", blank=True)
    basic = models.BooleanField(default=False)
    category = models.CharField(max_length=20, null=True, blank=True)
    dept_if_not_basic = models.ForeignKey(
        GlobalsDepartmentinfo, on_delete=models.CASCADE, blank=True, null=True
    )

    class Meta:
        db_table = "globals_designation"

    def __str__(self):
        return self.name


class GlobalsExtrainfo(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    title = models.CharField(max_length=20, default="", blank=True)
    sex = models.CharField(max_length=2, default="", blank=True)
    date_of_birth = models.DateField(default=datetime.date.today)
    user_status = models.CharField(max_length=50, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    address = models.TextField(default="", blank=True)
    phone_no = models.BigIntegerField(blank=True, null=True)
    user_type = models.CharField(max_length=20, choices=UserType.choices, default=UserType.STUDENT)
    profile_picture = models.CharField(max_length=100, blank=True, null=True)
    about_me = models.TextField(default="", blank=True)
    date_modified = models.DateTimeField(blank=True, null=True)
    department = models.ForeignKey(
        GlobalsDepartmentinfo, on_delete=models.CASCADE, blank=True, null=True
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="extrainfo")

    class Meta:
        db_table = "globals_extrainfo"


class Staff(models.Model):
    id = models.OneToOneField(GlobalsExtrainfo, on_delete=models.CASCADE, primary_key=True)

    class Meta:
        db_table = "globals_staff"

    def __str__(self):
        return str(self.id)


class GlobalsHoldsDesignation(models.Model):
    held_at = models.DateTimeField(auto_now=True)
    designation = models.ForeignKey(
        GlobalsDesignation, related_name="designees", on_delete=models.CASCADE
    )
    user = models.ForeignKey(User, related_name="holds_designations", on_delete=models.CASCADE)
    working = models.ForeignKey(User, related_name="current_designation", on_delete=models.CASCADE)

    class Meta:
        db_table = "globals_holdsdesignation"
        unique_together = (("user", "designation"), ("working", "designation"))


class GlobalsModuleaccess(models.Model):
    designation = models.CharField(max_length=155)
    program_and_curriculum = models.BooleanField()
    course_registration = models.BooleanField()
    course_management = models.BooleanField()
    other_academics = models.BooleanField()
    spacs = models.BooleanField()
    department = models.BooleanField()
    examinations = models.BooleanField()
    hr = models.BooleanField()
    iwd = models.BooleanField()
    complaint_management = models.BooleanField()
    fts = models.BooleanField()
    purchase_and_store = models.BooleanField()
    rspc = models.BooleanField()
    hostel_management = models.BooleanField()
    mess_management = models.BooleanField()
    gymkhana = models.BooleanField()
    placement_cell = models.BooleanField()
    visitor_hostel = models.BooleanField()
    phc = models.BooleanField()
    inventory_management = models.BooleanField()

    class Meta:
        db_table = "globals_moduleaccess"


class StudentCategory(models.TextChoices):
    GEN = "GEN", "General"
    OBC = "OBC", "Other Backward Class"
    SC = "SC", "Scheduled Caste"
    ST = "ST", "Scheduled Tribe"
    EWS = "EWS", "Economically Weaker Section"


class Student(models.Model):
    id = models.OneToOneField(GlobalsExtrainfo, on_delete=models.CASCADE, primary_key=True)
    programme = models.CharField(max_length=10)
    batch = models.IntegerField(default=2016)
    cpi = models.FloatField(default=0)
    category = models.CharField(max_length=10, choices=StudentCategory.choices)
    father_name = models.CharField(max_length=40, default="", null=True)
    mother_name = models.CharField(max_length=40, default="", null=True)
    hall_no = models.IntegerField(default=0)
    room_no = models.CharField(max_length=10, blank=True, null=True)
    specialization = models.CharField(max_length=40, null=True, default="")
    curr_semester_no = models.IntegerField(default=1)
    batch_id = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.CASCADE)

    class Meta:
        db_table = "academic_information_student"

    def __str__(self):
        return str(self.id.user.username)


class GlobalsFaculty(models.Model):
    id = models.OneToOneField(GlobalsExtrainfo, on_delete=models.CASCADE, primary_key=True)

    class Meta:
        db_table = "globals_faculty"

    def __str__(self):
        return str(self.id)


class RoleModulePermission(models.Model):
    id = models.AutoField(primary_key=True)
    designation = models.ForeignKey(
        GlobalsDesignation, on_delete=models.CASCADE, related_name="module_permissions"
    )
    module = models.CharField(max_length=100)
    view = models.BooleanField(default=False)
    create = models.BooleanField(default=False)
    edit = models.BooleanField(default=False)
    delete = models.BooleanField(default=False)

    class Meta:
        db_table = "system_admin_role_module_permission"
        unique_together = ["designation", "module"]

    def __str__(self):
        return f"{self.designation.name} -> {self.module}"


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("user_created", "User Created"),
        ("user_activated", "User Activated"),
        ("user_deactivated", "User Deactivated"),
        ("user_archived", "User Archived"),
        ("role_assigned", "Role Assigned"),
        ("role_reassigned", "Role Reassigned"),
        ("role_revoked", "Role Revoked"),
        ("password_reset", "Password Reset"),
        ("bulk_import", "Bulk Import"),
        ("emergency_access", "Emergency Access Granted"),
        ("role_switched", "Role Switched"),
        ("module_access", "Module Access"),
        ("department_head_assigned", "Department Head Assigned"),
    ]

    id = models.AutoField(primary_key=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_actions"
    )
    target_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events"
    )
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "system_admin_audit_log"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.action} by {self.performed_by} at {self.timestamp}"


class RoleConflictMatrix(models.Model):
    """BR-SA-007: Separation of Duties - defines conflicting roles"""
    id = models.AutoField(primary_key=True)
    role1 = models.ForeignKey(GlobalsDesignation, on_delete=models.CASCADE, related_name="conflicts_with")
    role2 = models.ForeignKey(GlobalsDesignation, on_delete=models.CASCADE, related_name="conflicts_also")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "system_admin_role_conflict_matrix"
        unique_together = ["role1", "role2"]

    def __str__(self):
        return f"{self.role1} conflicts with {self.role2}"


class ArchivedUserData(models.Model):
    """UC-014: Archive User/Data - stores archived user information"""
    id = models.AutoField(primary_key=True)
    original_user_id = models.IntegerField()
    user_data = models.JSONField()  # Complete user snapshot
    archived_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="archived_users")
    archived_at = models.DateTimeField(auto_now_add=True)
    archive_reason = models.TextField()
    retention_until = models.DateField()  # Data retention period
    is_restored = models.BooleanField(default=False)
    restored_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "system_admin_archived_user_data"
        ordering = ["-archived_at"]

    def __str__(self):
        return f"Archived User {self.original_user_id} at {self.archived_at}"


class EmergencyAccessLog(models.Model):
    """UC-022: Emergency User Access - track emergency access grants"""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
        ("revoked", "Revoked"),
        ("expired", "Expired"),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="emergency_accesses")
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="emergency_requests"
    )
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="emergency_grants")
    requested_role = models.ForeignKey(
        GlobalsDesignation, on_delete=models.SET_NULL, null=True, blank=True, related_name="emergency_requests"
    )
    approved_role = models.ForeignKey(
        GlobalsDesignation, on_delete=models.SET_NULL, null=True, blank=True, related_name="emergency_approvals"
    )
    approver_name = models.CharField(max_length=100)  # Director/CTO who approved
    approver_designation = models.CharField(max_length=100)
    justification = models.TextField()
    requested_start = models.DateTimeField(null=True, blank=True)
    requested_end = models.DateTimeField(null=True, blank=True)
    approved_start = models.DateTimeField(null=True, blank=True)
    approved_end = models.DateTimeField(null=True, blank=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    decision_note = models.TextField(blank=True, default="")
    hold = models.ForeignKey(
        "GlobalsHoldsDesignation", on_delete=models.SET_NULL, null=True, blank=True, related_name="emergency_accesses"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "system_admin_emergency_access_log"
        ordering = ["-granted_at"]

    def __str__(self):
        return f"Emergency access for {self.user} granted at {self.granted_at}"


class UserRoleSession(models.Model):
    """UC-015: Switch Role - tracks user's active role in session"""
    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="active_role_session")
    active_designation = models.ForeignKey(GlobalsDesignation, on_delete=models.SET_NULL, null=True)
    switched_at = models.DateTimeField(auto_now=True)
    session_data = models.JSONField(default=dict)  # Role-specific session data

    class Meta:
        db_table = "system_admin_user_role_session"

    def __str__(self):
        return f"{self.user} active as {self.active_designation}"
