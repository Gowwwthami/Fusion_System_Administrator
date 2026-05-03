"""
System Admin Module Constants
All previously hardcoded values are centralized here per audit fix S8.
"""

# Default values
DEFAULT_DEPARTMENT = "CSE"
DEFAULT_USER_TYPE = "student"
DEFAULT_PHONE_NO = "9999999999"

# User types
USER_TYPE_STUDENT = "student"
USER_TYPE_FACULTY = "faculty"
USER_TYPE_STAFF = "staff"

# User statuses
USER_STATUS_ACTIVE = "active"
USER_STATUS_INACTIVE = "inactive"
USER_STATUS_ARCHIVED = "archived"

# Student categories
CATEGORY_UG = "UG"
CATEGORY_PG = "PG"
CATEGORY_PHD = "PhD"

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Notification subjects
NOTIFICATION_USER_CREATED = "FusionERP: Your account has been created"
NOTIFICATION_ROLE_ASSIGNED = "FusionERP: A new role has been assigned to you"
NOTIFICATION_ROLE_REASSIGNED = "FusionERP: Your role has been updated"
NOTIFICATION_ROLE_EXPIRY = "FusionERP: Role expiry reminder"
NOTIFICATION_ACCOUNT_DEACTIVATED = "FusionERP: Your account has been deactivated"
NOTIFICATION_ACCOUNT_ARCHIVED = "FusionERP: Your account has been archived"
NOTIFICATION_PASSWORD_RESET = "FusionERP: Your password has been reset"

# Required fields per user type
REQUIRED_FIELDS_STUDENT = ["username", "first_name", "last_name", "email", "batch_id", "programme_id"]
REQUIRED_FIELDS_FACULTY = ["username", "first_name", "last_name", "email", "department_id", "designation_id"]
REQUIRED_FIELDS_STAFF = ["username", "first_name", "last_name", "email", "department_id", "designation_id"]

# CSV import column names
CSV_COLUMNS_STUDENT = ["username", "first_name", "last_name", "email", "batch", "programme", "category", "phone"]
CSV_COLUMNS_FACULTY = ["username", "first_name", "last_name", "email", "department", "designation", "phone"]
CSV_COLUMNS_STAFF = ["username", "first_name", "last_name", "email", "department", "designation", "phone"]
