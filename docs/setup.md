# Setting up Molly

Molly talks straight to your [Baby Buddy](https://github.com/babybuddy/babybuddy) (v2.11 or later). It has no server of its own and stores nothing except each device's login and settings. This guide covers what Baby Buddy, Cloudflare and the web server need.

The Android app works with Baby Buddy as soon as there is a user and an API key (one shared by both parents is simplest, [section 1](#1-baby-buddy-users)). The web app needs one more Baby Buddy setting ([CORS](#3-cors-web-app-only)).

The app's "How to fix" links show short versions of these sections (`apps/molly/src/features/help/topics.ts`); keep the two in step.

## 1. Baby Buddy users

**Recommended: one shared user for both parents.** Sign in on every phone and browser with the same Baby Buddy user, for example the admin account you made when setting Baby Buddy up, or a new user created under **Users** (the `/users/` page) → **Add user** with both **Caregiver** and **Read only** unticked (Baby Buddy then makes it a superuser). A superuser has every permission Molly needs, so both parents can start, stop and cancel each other's timers and edit or delete any entry, with nothing to set up.

The only thing a shared user gives up: Molly can't tell who started a running timer, so it always says "you". A user that can do everything in Baby Buddy also means anyone with the key can delete entries; keep the key private ([section 2](#2-api-key)).

**Separate users for each parent** work too, if you want Baby Buddy to record who logged what. Molly then shows whether a timer was started by "you" or "someone else". Make each one a superuser as above, or give caregivers the permissions below.

**If a parent should be a caregiver**, Baby Buddy's caregiver group is not enough. It can't read its own profile (so Molly can't sign in) and can't delete anything. Delete permissions matter most: in Baby Buddy, stopping or cancelling another user's timer is a delete, and so is **Delete** on Molly's edit screen. Without them a caregiver can only stop their own timers and can't remove a mistake. Grant these in Baby Buddy's Django admin, `/admin/` → **Users** → the user → **User permissions**:

| Permission | Needed to |
| --- | --- |
| `Baby Buddy \| settings \| Can view settings` (`babybuddy.view_settings`) | sign in to Molly |
| `Core \| Timer \| Can delete Timer` (`core.delete_timer`) | stop or cancel the other parent's timers, and cancel any timer at all |
| `Core \| Sleep \| Can delete Sleep`, `Core \| Feeding \| Can delete Feeding`, `Core \| Diaper Change \| Can delete Diaper Change`, `Core \| Medication \| Can delete Medication` | delete entries |
| `Core \| Tag \| Can change Tag`, `Core \| Tag \| Can add Tag` | tag entries (for example "mixed"), and skip a nap |
| `Core \| Height \| Can view Height` / `Can add Height`, the same for `Head Circumference` and `BMI` | see and log height, head circumference and BMI on the child screen (weight and temperature need nothing extra) |

**Skipping a nap** saves a Baby Buddy note tagged `molly-skip` (text like `Skipped nap 15:05–15:45`), so both phones see it; Undo retags it `molly-skip-undone`. That needs `core.add_note` and `core.change_note`, which the caregiver group already has, plus the two tag permissions above (the first skip creates the tag). Molly never deletes notes, so `core.delete_note` isn't needed.

Without `core.delete_timer`, stopping the other parent's timer shows "needs permission to stop other people's timers". Molly can't detect this in advance.

## 2. API key

**Easiest, in the Android app:** on Molly's connect screen tap **Scan the login QR code**, and point the camera at the **Login QR code** on Baby Buddy's **Add a device** page (user menu → Add a device, `/user/add-device/`). Molly fills in the address and key and connects. The code holds your API key, so don't share it. On the web, where scanning isn't available, you can paste the code's text (`BABYBUDDY-LOGIN:{…}`) into the address field instead.

Or type it in: the key is on the user's Baby Buddy **Settings** page (`/user/settings/`), under **API key**. Copy it into Molly exactly. **Regenerate** makes the old key stop working on every device that uses it.

## 3. CORS (web app only)

Browsers only let the web app call Baby Buddy if Baby Buddy allows Molly's web address. Set this environment variable on Baby Buddy and restart it:

```sh
CORS_ALLOWED_ORIGINS=https://molly.example.com
```

Use Molly's exact origin: scheme, host and port if any, no path and no trailing slash. Separate several origins with commas, for example to also allow `http://localhost:8080` while testing locally.

The Android app is not a browser, so CORS never applies to it.

## 4. Cloudflare Tunnel and Access

A typical setup exposes both through Cloudflare Tunnel:

- **Baby Buddy**, e.g. `baby.example.com`. If Cloudflare Access protects it, add an Access **bypass** policy for the path `/api/*`. Molly authenticates with the API key, and without the bypass Access answers with its login page, which Molly reports as "can't reach". Keep the rest of Baby Buddy behind Access if you like.
- **Molly's web app**, e.g. `molly.example.com`, can stay fully behind Access. It holds no data or secrets itself.

## 5. Running the web app

The web app is an nginx image built from this repo (see the main README for the toolchain). It needs one setting, `BABY_BUDDY_ORIGIN`: Baby Buddy's origin, the only address the app is allowed to call. The container refuses to start without a valid one.

**On your computer:**

```sh
echo 'BABY_BUDDY_ORIGIN=https://baby.example.com' > docker/.env   # gitignored
pnpm web:up       # http://localhost:8080 (MOLLY_PORT in docker/.env changes the port)
pnpm web:down
```

For `pnpm web:up` against a real Baby Buddy, that Baby Buddy's `CORS_ALLOWED_ORIGINS` must include `http://localhost:8080`.

**On an arm64 host (e.g. a Raspberry Pi):**

```sh
pnpm web:image:pi        # on your computer: writes dist/molly-web-arm64.tar
```

Copy `dist/molly-web-arm64.tar` and `docker/compose.yml` to the host, create a `.env` next to `compose.yml` with `BABY_BUDDY_ORIGIN=…`, then:

```sh
docker load < molly-web-arm64.tar
docker compose up -d
```

Repeat the copy and `docker load` + `docker compose up -d` for each new version.

## 6. The Android app

Build and install it as described in [android-build.md](android-build.md). Plain `http://` addresses are accepted only on the home network (`localhost`, `*.local`, `10.x`, `172.16–31.x`, `192.168.x`); anything else must be `https://`.

## 7. Troubleshooting "Can't reach Baby Buddy"

Work through these in order:

1. **Baby Buddy is down or the address is wrong.** Open the address in a browser: you should see Baby Buddy. Use that address (Molly strips a trailing `/api`).
2. **Plain `http://` to a public address.** Only home-network addresses may use `http://` (see [section 6](#6-the-android-app)).
3. **Cloudflare Access** answers instead of Baby Buddy. Add the `/api/*` bypass ([section 4](#4-cloudflare-tunnel-and-access)). In a browser's developer tools this often looks like a CORS error, because the Access login redirect has no CORS headers.
4. **Web app only, CORS:** `CORS_ALLOWED_ORIGINS` on Baby Buddy doesn't list Molly's exact web origin ([section 3](#3-cors-web-app-only)). The browser console says "blocked by CORS policy".
5. **Web app only, `BABY_BUDDY_ORIGIN`:** the web server only allows the Baby Buddy origin it was started with ([section 5](#5-running-the-web-app)). The browser console says "violates the Content Security Policy".

Other messages:

- **"Key rejected"**: the API key is wrong or was regenerated ([section 2](#2-api-key)).
- **"Your Baby Buddy user can't read its own profile"**: a caregiver without `babybuddy.view_settings` ([section 1](#1-baby-buddy-users)).
- **"Started by someone else… needs permission"**: the stopping parent lacks `core.delete_timer` ([section 1](#1-baby-buddy-users)).
- **The widget says "Not updated since HH:MM"**: its last refresh failed. It keeps showing the last data it got, and refreshes when you tap it, open the app, or every 30 minutes.
- **No lock-screen notification for a running timer**: Molly shows one only for timers this phone knows about (started here, or seen when the app opened or the widget refreshed). If it's still missing, open Molly's Settings. "Lock screen" must be On, and a red note there means Android is blocking Molly's notifications: tap "Open Android settings" and allow them. If you swiped the notification away, it comes back with the next timer.
- **A notification or widget button takes a while, or does nothing, with the app closed**: battery optimisation may be delaying Molly. In Android settings, open Apps → Molly → Battery and choose "Unrestricted". Some phone brands need this more than others.
