from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("system_admin", "0002_alter_auditlog_action"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsdesignation",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="globalsdesignation",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name="RoleModulePermission",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("module", models.CharField(max_length=100)),
                ("view", models.BooleanField(default=False)),
                ("create", models.BooleanField(default=False)),
                ("edit", models.BooleanField(default=False)),
                ("delete", models.BooleanField(default=False)),
                (
                    "designation",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="module_permissions",
                        to="system_admin.globalsdesignation",
                    ),
                ),
            ],
            options={
                "db_table": "system_admin_role_module_permission",
                "unique_together": {("designation", "module")},
            },
        ),
    ]
