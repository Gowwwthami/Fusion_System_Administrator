"""
Management command to seed dummy users and role assignments for testing.
Run: python manage.py seed_dummy_data --count 200
"""
import random
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from system_admin import services
from system_admin.models import (
    GlobalsDepartmentinfo,
    GlobalsDesignation,
    GlobalsExtrainfo,
    GlobalsHoldsDesignation,
    Programme,
    Discipline,
    Batch,
    Student,
    GlobalsFaculty,
    Staff,
    UserStatus,
    UserType,
    StudentCategory,
    RoleModulePermission,
    AuditLog,
)


FIRST_NAMES = [
    "Aarav", "Diya", "Isha", "Kabir", "Meera", "Ravi", "Sana", "Vikram",
    "Anaya", "Kiran", "Neha", "Rahul", "Tara", "Vivek", "Zoya", "Arjun",
]

LAST_NAMES = [
    "Sharma", "Patel", "Iyer", "Nair", "Verma", "Das", "Singh", "Khan",
    "Reddy", "Gupta", "Joshi", "Bose", "Mehta", "Saxena", "Menon", "Rao",
]

TITLES = ["Mr", "Ms", "Dr", "Prof"]


def _random_name() -> tuple[str, str]:
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def _random_dob(min_age: int = 18, max_age: int = 60) -> date:
    days = random.randint(min_age * 365, max_age * 365)
    return date.today() - timedelta(days=days)


def _ensure_reference_data():
    if not GlobalsDepartmentinfo.objects.exists():
        for short in ["CSE", "ECE", "ME", "SM", "DS"]:
            GlobalsDepartmentinfo.objects.get_or_create(name=short)

    if not Discipline.objects.exists():
        Discipline.objects.get_or_create(
            name="Computer Science and Engineering",
            defaults={"acronym": "CSE"},
        )

    if not Batch.objects.exists():
        discipline = Discipline.objects.first()
        for year in [2020, 2021, 2022, 2023, 2024]:
            Batch.objects.get_or_create(
                name=str(year),
                year=year,
                defaults={"discipline": discipline},
            )

    if not Programme.objects.exists():
        programmes = ["B.Tech", "M.Tech", "PhD", "M.Des", "B.Des"]
        for name in programmes:
            category = (name.split(".")[0] or name)[:3]
            Programme.objects.get_or_create(
                name=name,
                defaults={"category": category, "programme_begin_year": 2024},
            )

    if not GlobalsDesignation.objects.exists():
        roles = [
            ("Professor", "Faculty"),
            ("Associate Professor", "Faculty"),
            ("Assistant Professor", "Faculty"),
            ("Technical Staff", "Staff"),
            ("Administrative Staff", "Staff"),
            ("Lab Assistant", "Staff"),
            ("Mess Admin", "General"),
            ("Library Admin", "General"),
            ("Academic Admin", "General"),
            ("Hostel Admin", "General"),
            ("Finance Admin", "General"),
            ("Placement Admin", "General"),
        ]
        for name, role_type in roles:
            GlobalsDesignation.objects.get_or_create(
                name=name,
                defaults={
                    "full_name": name,
                    "type": role_type,
                    "basic": role_type in {"Faculty", "Staff"},
                },
            )

    # Ensure module permissions exist for known roles
    for role_name, modules in services.MODULE_ACCESS.items():
        role = GlobalsDesignation.objects.filter(name=role_name).first()
        if not role:
            continue
        for module in modules:
            RoleModulePermission.objects.update_or_create(
                designation=role,
                module=module["module"],
                defaults={
                    "view": module["view"],
                    "create": module["create"],
                    "edit": module["edit"],
                    "delete": module["delete"],
                },
            )


class Command(BaseCommand):
    help = "Seeds dummy users, profiles, and role assignments for testing."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=200)
        parser.add_argument("--students", type=int, default=None)
        parser.add_argument("--faculty", type=int, default=None)
        parser.add_argument("--staff", type=int, default=None)
        parser.add_argument("--password", type=str, default="Test@123")

    @transaction.atomic
    def handle(self, *args, **options):
        total = options["count"]
        students = options["students"]
        faculty = options["faculty"]
        staff = options["staff"]
        password = options["password"]

        if students is None and faculty is None and staff is None:
            students = int(total * 0.4)
            faculty = int(total * 0.3)
            staff = total - students - faculty
        else:
            students = students or 0
            faculty = faculty or 0
            staff = staff or 0
            total = students + faculty + staff

        _ensure_reference_data()

        departments = list(GlobalsDepartmentinfo.objects.all())
        programmes = list(Programme.objects.values_list("name", flat=True))
        batches = list(Batch.objects.all())
        roles_faculty = list(GlobalsDesignation.objects.filter(name__in=[
            "Professor", "Associate Professor", "Assistant Professor",
        ]))
        roles_staff = list(GlobalsDesignation.objects.filter(name__in=[
            "Technical Staff", "Administrative Staff", "Lab Assistant",
        ]))

        admin_user = User.objects.filter(is_superuser=True).first()

        def create_user(prefix: str, user_type: str, index: int):
            username = f"{prefix}{index:04d}"
            if User.objects.filter(username=username).exists():
                return None
            first_name, last_name = _random_name()
            email = f"{username}@example.com"
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=(user_type != UserType.STUDENT),
            )

            department = random.choice(departments) if departments else None
            extra, _ = GlobalsExtrainfo.objects.get_or_create(
                user=user,
                defaults={
                    "id": username,
                    "title": random.choice(TITLES),
                    "sex": random.choice(["M", "F"]),
                    "date_of_birth": _random_dob(),
                    "user_status": UserStatus.ACTIVE,
                    "address": "Test Address",
                    "phone_no": random.randint(6000000000, 9999999999),
                    "user_type": user_type,
                    "about_me": "Test profile",
                    "department": department,
                },
            )

            if user_type == UserType.STUDENT:
                batch_obj = random.choice(batches) if batches else None
                programme = random.choice(programmes) if programmes else "B.Tech"
                Student.objects.get_or_create(
                    id=extra,
                    defaults={
                        "programme": programme,
                        "batch": batch_obj.year if batch_obj else 2024,
                        "cpi": round(random.uniform(6.0, 9.5), 2),
                        "category": random.choice([c[0] for c in StudentCategory.choices]),
                        "father_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                        "mother_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                        "hall_no": random.randint(1, 12),
                        "room_no": str(random.randint(1, 200)),
                        "specialization": "",
                        "curr_semester_no": random.randint(1, 8),
                        "batch_id": batch_obj,
                    },
                )
            elif user_type == UserType.FACULTY:
                GlobalsFaculty.objects.get_or_create(id=extra)
            else:
                Staff.objects.get_or_create(id=extra)

            if user_type == UserType.FACULTY and roles_faculty:
                designation = random.choice(roles_faculty)
                GlobalsHoldsDesignation.objects.get_or_create(
                    user=user,
                    designation=designation,
                    defaults={"working": user},
                )
            if user_type == UserType.STAFF and roles_staff:
                designation = random.choice(roles_staff)
                GlobalsHoldsDesignation.objects.get_or_create(
                    user=user,
                    designation=designation,
                    defaults={"working": user},
                )

            if admin_user:
                AuditLog.objects.create(
                    action="user_created",
                    performed_by=admin_user,
                    target_user=user,
                    details={"seeded": True, "user_type": user_type},
                )
            return user

        def seed_group(prefix: str, count: int, user_type: str):
            created = 0
            start_index = User.objects.filter(username__startswith=prefix).count() + 1
            index = start_index
            while created < count:
                if create_user(prefix, user_type, index):
                    created += 1
                index += 1
            return created

        created_students = seed_group("stu", students, UserType.STUDENT)
        created_faculty = seed_group("fac", faculty, UserType.FACULTY)
        created_staff = seed_group("stf", staff, UserType.STAFF)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_students} students, {created_faculty} faculty, {created_staff} staff (total {total})."
        ))
