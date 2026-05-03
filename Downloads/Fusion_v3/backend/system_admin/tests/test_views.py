"""
Integration tests for System Admin API views.
"""

from datetime import datetime

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from ..models import (
    GlobalsDepartmentinfo,
    GlobalsDesignation,
    Discipline,
    Batch,
    Programme,
    RoleModulePermission,
    GlobalsExtrainfo,
    GlobalsHoldsDesignation,
    UserType,
    UserStatus,
)


class BaseAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="superadmin", email="admin@test.com", password="adminpass"
        )
        self.client.force_authenticate(user=self.admin)

        self.dept = GlobalsDepartmentinfo.objects.create(name="CSE")
        self.designation = GlobalsDesignation.objects.create(
            name="Assistant Professor",
            full_name="Assistant Professor",
            type="system",
            basic=False,
            category="system",
            dept_if_not_basic=None,
        )
        self.super_admin_designation = GlobalsDesignation.objects.create(
            name="Super Admin",
            full_name="System role admin",
            type="system",
            basic=False,
            category="system",
            dept_if_not_basic=None,
        )
        self.discipline = Discipline.objects.create(name="Computer Science and Engineering", acronym="CSE")
        self.batch = Batch.objects.create(name="B.Tech 2024", discipline=self.discipline, year=2024)
        self.programme = Programme.objects.create(name="B.Tech CSE", category="B", programme_begin_year=2024)

        self.admin_extra = GlobalsExtrainfo.objects.create(
            id="admin",
            user=self.admin,
            user_type=UserType.STAFF,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )
        GlobalsHoldsDesignation.objects.create(
            user=self.admin,
            designation=self.super_admin_designation,
            working=self.admin,
        )


class TestReferenceDataEndpoints(BaseAPITestCase):
    def test_departments_returns_200(self):
        response = self.client.get("/api/v1/system-admin/departments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_batches_returns_200(self):
        response = self.client.get("/api/v1/system-admin/batches/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_programmes_returns_200(self):
        response = self.client.get("/api/v1/system-admin/programmes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestUserCreation(BaseAPITestCase):
    def test_add_student_success(self):
        response = self.client.post("/api/v1/system-admin/users/add-student/", {
            "username": "student001",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@gmail.com",
            "batch_id": self.batch.id,
            "programme_id": self.programme.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_add_student_rejects_non_gmail_email(self):
        response = self.client.post("/api/v1/system-admin/users/add-student/", {
            "username": "student001x",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@college.edu",
            "batch_id": self.batch.id,
            "programme_id": self.programme.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("gmail", str(response.data).lower())

    def test_add_student_missing_fields_returns_400(self):
        response = self.client.post("/api/v1/system-admin/users/add-student/", {
            "username": "student002",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_faculty_success(self):
        response = self.client.post("/api/v1/system-admin/users/add-faculty/", {
            "username": "faculty001",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@gmail.com",
            "department_id": "CSE",
            "designation_id": self.designation.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_request_returns_403(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/v1/system-admin/users/add-student/", {})
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_bulk_create_students_success(self):
        payload = {
            "user_type": "student",
            "users": [
                {
                    "username": "bulkstudent01",
                    "first_name": "Bulk",
                    "last_name": "One",
                    "email": "bulkstudent01@gmail.com",
                    "batch_id": self.batch.id,
                    "programme_id": self.programme.id,
                },
                {
                    "username": "bulkstudent02",
                    "first_name": "Bulk",
                    "last_name": "Two",
                    "email": "bulkstudent02@gmail.com",
                    "batch_id": self.batch.id,
                    "programme_id": self.programme.id,
                },
            ],
        }
        response = self.client.post("/api/v1/system-admin/users/bulk-create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["results"]["created"]), 2)
        self.assertEqual(len(response.data["results"]["failed"]), 0)

    def test_bulk_create_reports_failures_when_all_rows_invalid(self):
        payload = {
            "user_type": "faculty",
            "users": [
                {
                    "username": "",
                    "first_name": "No",
                    "last_name": "Username",
                    "email": "invalid",
                    "department_id": "CSE",
                    "designation_id": self.designation.id,
                }
            ],
        }
        response = self.client.post("/api/v1/system-admin/users/bulk-create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]["created"]), 0)
        self.assertEqual(len(response.data["results"]["failed"]), 1)

    def test_bulk_create_faculty_accepts_designation_name(self):
        payload = {
            "user_type": "faculty",
            "users": [
                {
                    "username": "bulkfaculty01",
                    "first_name": "Bulk",
                    "last_name": "Faculty",
                    "email": "bulkfaculty01@gmail.com",
                    "department_id": "CSE",
                    "designation_id": self.designation.name,
                }
            ],
        }
        response = self.client.post("/api/v1/system-admin/users/bulk-create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["results"]["created"]), 1)
        self.assertEqual(len(response.data["results"]["failed"]), 0)


class TestRoleManagement(BaseAPITestCase):
    def _create_test_user(self, username="testfaculty"):
        from ..models import GlobalsExtrainfo, UserType, UserStatus
        user = User.objects.create_user(username=username, email=f"{username}@test.com")
        extra = GlobalsExtrainfo.objects.create(
            id=username,
            user=user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )
        return user, extra

    def test_assign_role_success(self):
        user, _ = self._create_test_user("roleuser1")
        response = self.client.post("/api/v1/system-admin/roles/assign/", {
            "username": "roleuser1",
            "designation_id": self.designation.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_user_roles_success(self):
        self._create_test_user("roleuser2")
        response = self.client.get("/api/v1/system-admin/roles/user/?username=roleuser2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_assign_role_blocks_unsuitable_user_profile(self):
        from ..models import GlobalsExtrainfo, UserType, UserStatus

        user = User.objects.create_user(username="studentrole1", email="studentrole1@test.com")
        GlobalsExtrainfo.objects.create(
            id="studentrole1",
            user=user,
            user_type=UserType.STUDENT,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )
        restricted_designation = GlobalsDesignation.objects.create(
            name="Dean",
            full_name="Dean",
            type="system",
            basic=False,
            category="system",
            dept_if_not_basic=None,
        )

        response = self.client.post(
            "/api/v1/system-admin/roles/assign/",
            {
                "username": "studentrole1",
                "designation_id": restricted_designation.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("eligible", str(response.data["error"]).lower())

    def test_assignable_roles_filters_for_cse_faculty(self):
        user = User.objects.create_user(username="csefaculty", email="csefaculty@test.com")
        extra = GlobalsExtrainfo.objects.create(
            id="csefaculty",
            user=user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )

        GlobalsHoldsDesignation.objects.create(
            user=user,
            designation=self.designation,
            working=user,
        )

        response = self.client.get("/api/v1/system-admin/roles/assignable/?username=csefaculty")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        role_names = {item["name"] for item in response.data}
        self.assertNotIn("Assistant Professor", role_names)
        self.assertNotIn("Dean", role_names)

    def test_assign_role_blocks_duplicate_active_role(self):
        user = User.objects.create_user(username="dup-role-user", email="duprole@test.com")
        extra = GlobalsExtrainfo.objects.create(
            id="dup-role-user",
            user=user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )
        GlobalsHoldsDesignation.objects.create(
            user=user,
            designation=self.designation,
            working=user,
        )

        response = self.client.post(
            "/api/v1/system-admin/roles/assign/",
            {"username": "dup-role-user", "designation_id": self.designation.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already holds", str(response.data.get("error", "")).lower())

    def test_hod_exclusivity_blocks_second_hod_in_same_department(self):
        hod_role = GlobalsDesignation.objects.create(
            name="Head of Department",
            full_name="Head of Department",
            type="system",
            basic=False,
            category="system",
            dept_if_not_basic=None,
        )
        first_user = User.objects.create_user(username="hod1", email="hod1@test.com")
        second_user = User.objects.create_user(username="hod2", email="hod2@test.com")

        first_extra = GlobalsExtrainfo.objects.create(
            id="hod1",
            user=first_user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )
        second_extra = GlobalsExtrainfo.objects.create(
            id="hod2",
            user=second_user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )

        self.client.post("/api/v1/system-admin/roles/assign/", {
            "username": "hod1",
            "designation_id": hod_role.id,
        }, format="json")

        response = self.client.post("/api/v1/system-admin/roles/assign/", {
            "username": "hod2",
            "designation_id": hod_role.id,
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already has an active HOD", str(response.data.get("error", "")))


class TestAuditLogs(BaseAPITestCase):
    def test_audit_logs_returns_200(self):
        response = self.client.get("/api/v1/system-admin/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_logs_require_admin(self):
        regular_user = User.objects.create_user(username="regular", password="pass")
        self.client.force_authenticate(user=regular_user)
        response = self.client.get("/api/v1/system-admin/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TestManageSystemRoles(BaseAPITestCase):
    def test_roles_list_returns_all_roles(self):
        response = self.client.get("/api/v1/system-admin/roles/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(role["name"] == "Super Admin" for role in response.data))

    def test_create_modify_deactivate_role_flow(self):
        create_payload = {
            "name": "Library Supervisor",
            "description": "Manages library operations",
            "permissions": [
                {
                    "module": "Library Catalog",
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                }
            ],
        }
        create_res = self.client.post("/api/v1/system-admin/roles/", create_payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_res.data["success"])
        role_id = create_res.data["role_id"]

        modify_payload = {
            "description": "Updated library role",
            "permissions": [
                {
                    "module": "Library Catalog",
                    "view": True,
                    "create": True,
                    "edit": False,
                    "delete": False,
                },
                {
                    "module": "Member Management",
                    "view": True,
                    "create": True,
                    "edit": True,
                    "delete": False,
                },
            ],
        }
        modify_res = self.client.put(f"/api/v1/system-admin/roles/{role_id}/", modify_payload, format="json")
        self.assertEqual(modify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(modify_res.data["success"])

        role = GlobalsDesignation.objects.get(id=role_id)
        self.assertEqual(role.full_name, "Updated library role")
        self.assertEqual(RoleModulePermission.objects.filter(designation=role).count(), 2)

        deactivate_res = self.client.patch(f"/api/v1/system-admin/roles/{role_id}/deactivate/", {}, format="json")
        self.assertEqual(deactivate_res.status_code, status.HTTP_200_OK)
        self.assertTrue(deactivate_res.data["success"])

        with self.assertRaises(GlobalsDesignation.DoesNotExist):
            GlobalsDesignation.objects.get(id=role_id)

    def test_role_management_requires_super_admin_role(self):
        regular = User.objects.create_user(username="regular-role-admin", password="pass")
        self.client.force_authenticate(user=regular)
        response = self.client.get("/api/v1/system-admin/roles/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_can_assign_role_without_inactive_flag(self):
        role = GlobalsDesignation.objects.create(
            name="Ops",
            full_name="Ops",
            type="system",
            basic=False,
            category="system",
            dept_if_not_basic=None,
        )
        user = User.objects.create_user(username="opsuser", email="opsuser@test.com")
        from ..models import GlobalsExtrainfo, UserType, UserStatus
        GlobalsExtrainfo.objects.create(
            id="opsuser",
            user=user,
            user_type=UserType.STAFF,
            user_status=UserStatus.ACTIVE,
            title="",
            sex="",
            date_of_birth="2000-01-01",
            address="",
            about_me="",
            department=self.dept,
            date_modified=datetime(2000, 1, 1),
        )

        response = self.client.post("/api/v1/system-admin/roles/assign/", {
            "username": "opsuser",
            "designation_id": role.id,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
