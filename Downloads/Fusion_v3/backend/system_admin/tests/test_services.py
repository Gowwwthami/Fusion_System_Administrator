"""
Unit tests for System Admin services.
Created per audit fix S3 - tests/ folder with comprehensive coverage.
"""

from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User

from ..services import (
    validate_required_fields,
    validation_error_response,
    handle_serializer_error,
    build_auth_user_data,
    build_extra_info_data,
)
from ..constants import (
    REQUIRED_FIELDS_STUDENT,
    REQUIRED_FIELDS_FACULTY,
    REQUIRED_FIELDS_STAFF,
    DEFAULT_PHONE_NO,
)
from ..models import UserStatus, UserType


class TestValidateRequiredFields(TestCase):
    def test_all_fields_present_returns_empty_list(self):
        data = {"username": "user1", "first_name": "A", "last_name": "B",
                "email": "a@b.com", "batch_id": 1, "programme_id": 2}
        result = validate_required_fields(data, REQUIRED_FIELDS_STUDENT)
        self.assertEqual(result, [])

    def test_missing_fields_returned(self):
        data = {"username": "user1"}
        result = validate_required_fields(data, REQUIRED_FIELDS_STUDENT)
        self.assertIn("first_name", result)
        self.assertIn("email", result)
        self.assertIn("batch_id", result)

    def test_empty_data_returns_all_required(self):
        result = validate_required_fields({}, REQUIRED_FIELDS_FACULTY)
        self.assertEqual(sorted(result), sorted(REQUIRED_FIELDS_FACULTY))


class TestValidationErrorResponse(TestCase):
    def test_returns_failure_with_message(self):
        result = validation_error_response(["username", "email"])
        self.assertFalse(result["success"])
        self.assertIn("username", result["error"])
        self.assertIn("email", result["error"])


class TestHandleSerializerError(TestCase):
    def test_returns_failure_with_errors(self):
        mock_serializer = MagicMock()
        mock_serializer.errors = {"username": ["This field is required."]}
        result = handle_serializer_error(mock_serializer, "test_table")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], mock_serializer.errors)


class TestBuildAuthUserData(TestCase):
    def test_builds_correct_dict(self):
        data = {
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "password": "securepass123",
        }
        result = build_auth_user_data(data)
        self.assertEqual(result["username"], "testuser")
        self.assertEqual(result["email"], "test@example.com")

    def test_generates_password_if_missing(self):
        data = {"username": "nopassword", "first_name": "X", "last_name": "Y", "email": "x@y.com"}
        result = build_auth_user_data(data)
        self.assertIn("password", result)
        self.assertGreater(len(result["password"]), 0)


class TestBuildExtraInfoData(TestCase):
    def test_uses_default_phone_when_missing(self):
        mock_dept = MagicMock()
        result = build_extra_info_data({}, UserType.STUDENT, mock_dept)
        self.assertEqual(result["phone_no"], DEFAULT_PHONE_NO)

    def test_uses_provided_phone(self):
        mock_dept = MagicMock()
        result = build_extra_info_data({"phone_no": "9876543210"}, UserType.FACULTY, mock_dept)
        self.assertEqual(result["phone_no"], "9876543210")

    def test_sets_active_status(self):
        mock_dept = MagicMock()
        result = build_extra_info_data({}, UserType.STAFF, mock_dept)
        self.assertEqual(result["user_status"], UserStatus.ACTIVE)


class TestCreateStudent(TestCase):
    @patch("system_admin.services.selectors.get_default_department")
    @patch("system_admin.services.selectors.get_batch_by_id")
    @patch("system_admin.services.selectors.get_programme_by_id")
    @patch("system_admin.services.send_account_created_email")
    def test_missing_fields_returns_error(self, mock_email, mock_prog, mock_batch, mock_dept):
        from ..services import create_student
        admin = User(username="admin", is_staff=True)
        result = create_student({"username": "only_username"}, admin)
        self.assertFalse(result["success"])
        mock_email.assert_not_called()


class TestAuditLog(TestCase):
    def test_audit_log_created_on_user_create(self):
        from ..models import AuditLog
        from ..services import _log_action

        admin = User.objects.create_user(username="admin_test", password="pass")
        target = User.objects.create_user(username="target_test", password="pass")
        _log_action("user_created", admin, target, {"user_type": "student"})

        log = AuditLog.objects.filter(action="user_created", performed_by=admin).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.target_user, target)
