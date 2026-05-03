"""
Management command to seed initial reference data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from system_admin.models import (
    GlobalsDepartmentinfo, Discipline, Batch, Programme,
    GlobalsDesignation,
)


class Command(BaseCommand):
    help = 'Seeds initial departments, batches, programmes, and designations'

    def handle(self, *args, **options):
        # ── Departments ──────────────────────────────────────────────
        departments = [
            ('CSE',  'Computer Science and Engineering'),
            ('ECE',  'Electronics and Communication Engineering'),
            ('ME',   'Mechanical Engineering'),
            ('SM',   'Smart Manufacturing'),
            ('DS',   'Design'),
        ]
        dept_objs = {}
        for short, _full in departments:
            obj, created = GlobalsDepartmentinfo.objects.get_or_create(name=short)
            dept_objs[short] = obj
            self.stdout.write(f"  {'Created' if created else 'Exists '} dept: {short}")

        cse = dept_objs['CSE']
        discipline, _ = Discipline.objects.get_or_create(
            name="Computer Science and Engineering",
            defaults={"acronym": "CSE"},
        )

        # ── Batches (use CSE as default discipline) ───────────────────
        for year in [2020, 2021, 2022, 2023, 2024]:
            obj, created = Batch.objects.get_or_create(
                name=str(year), year=year, defaults={'discipline': discipline}
            )
            self.stdout.write(f"  {'Created' if created else 'Exists '} batch: {year}")

        # ── Programmes ────────────────────────────────────────────────
        programmes = ['B.Tech', 'M.Tech', 'PhD', 'M.Des', 'B.Des']
        for name in programmes:
            category = (name.split(".")[0] or name)[:3]
            obj, created = Programme.objects.get_or_create(
                name=name,
                defaults={'category': category, 'programme_begin_year': 2024}
            )
            self.stdout.write(f"  {'Created' if created else 'Exists '} programme: {name}")

        # ── Designations ─────────────────────────────────────────────
        desigs = [
            'Professor', 'Associate Professor', 'Assistant Professor',
            'HOD', 'Dean', 'Director', 'Registrar',
            'Technical Staff', 'Administrative Staff', 'Lab Assistant',
            # Functional roles for module access
            'Mess Admin', 'Mess Caretaker', 'Mess Warden',
            'Library Admin', 'Academic Admin', 'Hostel Admin',
            'Finance Admin', 'Placement Admin',
        ]
        for name in desigs:
            obj, created = GlobalsDesignation.objects.get_or_create(name=name)
            self.stdout.write(f"  {'Created' if created else 'Exists '} designation: {name}")

        # ── Superuser ─────────────────────────────────────────────────
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@iiitdmj.ac.in', 'admin123')
            self.stdout.write(self.style.SUCCESS('\n  Created superuser: admin / admin123'))
        else:
            self.stdout.write('  Superuser admin already exists')

        self.stdout.write(self.style.SUCCESS('\nSeed data complete!'))
