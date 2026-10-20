# Runs inside the Baby Buddy container via `manage.py shell` (see seed.sh).
import datetime

from django.contrib.auth.models import Group, Permission, User
from rest_framework.authtoken.models import Token

from core.models import Child

child, _ = Child.objects.get_or_create(
    first_name="Test", last_name="Baby", defaults={"birth_date": datetime.date(2026, 4, 27)}
)

caregiver = Group.objects.get(name="caregiver")
# The caregiver group can't read /api/profile (needs babybuddy.view_settings), can't tag entries
# (needs change_tag, plus add_tag for a new tag) and has no delete permissions (Molly deletes
# entries). delete_timer is granted per user below.
PARENT_PERMS = [
    ("babybuddy", "view_settings"),
    ("core", "change_tag"),
    ("core", "add_tag"),
    ("core", "delete_sleep"),
    ("core", "delete_feeding"),
    ("core", "delete_diaperchange"),
    ("core", "delete_medication"),
]
# The caregiver group can log weight and temperature but not height, head circumference or BMI.
# parent_a keeps that (the forbidden path); parent_b gets them.
MEASUREMENT_PERMS = [
    ("core", f"{action}_{model}")
    for model in ("height", "headcircumference", "bmi")
    for action in ("view", "add")
]


def parent(username, perms):
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password(username)
        user.save()
    user.groups.add(caregiver)
    user.user_permissions.set(
        [Permission.objects.get(content_type__app_label=app, codename=code) for app, code in perms]
    )
    return user


users = {
    "ADMIN": User.objects.get(username="admin"),
    # Non-superuser without delete_timer: can't stop another user's timer, or cancel any timer.
    "PARENT_A": parent("parent_a", PARENT_PERMS),
    # Non-superuser with delete_timer: can stop and cancel anyone's timer. Can log every measurement.
    "PARENT_B": parent("parent_b", PARENT_PERMS + [("core", "delete_timer")] + MEASUREMENT_PERMS),
}
for name, user in users.items():
    token, _ = Token.objects.get_or_create(user=user)
    print(f"BB_{name}_ID={user.id}")
    print(f"BB_{name}_KEY={token.key}")
print(f"BB_CHILD_ID={child.id}")
