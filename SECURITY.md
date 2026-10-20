# Security

## Reporting a problem

Please report security problems privately through GitHub's **Report a vulnerability** button on the repository's Security tab, not in a public issue. It's a personal project, so replies may take a while.

## What Molly stores

Molly has no server of its own. Each device talks straight to the family's own [Baby Buddy](https://github.com/babybuddy/babybuddy) over its REST API.

- **Baby Buddy address and API key**, per device: in the Android keystore through Expo SecureStore on Android, in the browser's `localStorage` on the web.
- **Settings and a cache of recent entries**, per device: AsyncStorage on Android, browser storage on the web. Cleared on sign-out.
- **Widgets and lock-screen notifications** keep a small snapshot (running timers, last entries) on the phone so they can draw without opening the app.

Nothing is sent anywhere except the Baby Buddy address you enter. The web image's Content Security Policy only allows connections to that one origin (`BABY_BUDDY_ORIGIN`).

The API key gives full access to that Baby Buddy user. Anyone who can open the web app in a signed-in browser, or unlock the phone, can use it. Regenerating the key in Baby Buddy signs every device out.
