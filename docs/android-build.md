# Building the Android app

Molly's Android app is built locally (macOS or Linux) and installed with `adb` or by sideloading. No Play Store, no EAS.

## 1. Toolchain (once)

On macOS with Homebrew:

```sh
brew install --cask zulu@17 android-commandlinetools
```

Add to `~/.zprofile`, then open a new terminal:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

On Linux, install any JDK 17 and the Android command-line tools, and set `JAVA_HOME` and `ANDROID_HOME` the same way in your shell profile.

JDK 17 specifically: the React Native Gradle plugin targets it, and a newer default `java` breaks the build.

Install the SDK packages:

```sh
yes | sdkmanager --licenses
sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
```

## 2. Signing key (once, then back it up)

Release builds are signed with an upload key that lives outside the repo. Every future update must be signed with the same key: **if the keystore or its password is lost, installed apps can't be updated**, only uninstalled and reinstalled, which loses the app's data.

Create it:

```sh
mkdir -p ~/.molly-keys && chmod 700 ~/.molly-keys
read -rs MOLLY_KS_PASS && export MOLLY_KS_PASS   # type a long random password
keytool -genkeypair -keystore ~/.molly-keys/molly.jks -storetype PKCS12 -alias molly \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass:env MOLLY_KS_PASS -keypass:env MOLLY_KS_PASS -dname "CN=Molly, O=Example, C=SE"
chmod 600 ~/.molly-keys/molly.jks
```

Tell Gradle where it is, in `~/.gradle/gradle.properties` (never in the repo; `chmod 600` it):

```properties
MOLLY_UPLOAD_STORE_FILE=/Users/<you>/.molly-keys/molly.jks
MOLLY_UPLOAD_KEY_ALIAS=molly
MOLLY_UPLOAD_STORE_PASSWORD=<the password>
MOLLY_UPLOAD_KEY_PASSWORD=<the same password>
```

**Back up now:** put `molly.jks` (as an attachment) and the password into your password manager. Check the backup by comparing fingerprints:

```sh
keytool -list -keystore ~/.molly-keys/molly.jks -storepass:env MOLLY_KS_PASS | grep SHA-256
```

The app's signing is added by `apps/molly/plugins/with-release-signing.js`, a config plugin, so `expo prebuild --clean` keeps it. Without the `MOLLY_UPLOAD_*` properties the release build fails rather than falling back to the debug key.

## 3. Build and install

```sh
pnpm android:release
```

This runs `expo prebuild -p android --clean` and `./gradlew assembleRelease`, then prints the signing certificate. The certificate's SHA-256 must be the same for every build. It prints the APK path; install or update with:

```sh
adb install -r apps/molly/android/app/build/outputs/apk/release/app-release.apk
```

`-r` replaces the installed app and keeps its data. It only works when the new APK is signed with the same key.

The Android app id is `se.skedeback.molly`, the original author's. Android lets only one app per id on a phone, and updates must be signed with the same key, so your own build can't be installed next to (or over) someone else's build of Molly. To run your own copy side by side, or just to make it yours, change `expo.android.package` in `apps/molly/app.json` before your first install. The local Kotlin module (`se.skedeback.molly.notify`) keeps its own package name. A build with a changed id hasn't been tried yet, so check the widgets and lock-screen buttons after the first install. Changing the id later makes Android treat it as a different app, losing the data of the old one.

## Publishing a release

Ready-made APKs are attached to GitHub releases. A release is cut from `main` after the release pull request is merged and tagged; the whole flow (version bump, pull request, tag) is in [`releasing.md`](releasing.md). The APK part, on a checkout of the tag:

1. `pnpm android:release`, then rebuild for 64-bit ARM phones only, which cuts the APK from about 140 MB to about 60 MB: `(cd apps/molly/android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)`. Check that the certificate's SHA-256 matches the last release's (`apksigner verify --print-certs`).
2. Copy the APK to `molly-<version>.apk` and `gh release create v<version> molly-<version>.apk --verify-tag --title "Molly <version>" --notes-file <notes>`. If the upload times out (`HTTP 408`), create the release as a draft (`gh api -X POST repos/<owner>/molly/releases -F draft=true …`), upload the APK with `curl --data-binary` to the release's `uploads.github.com/…/assets?name=molly-<version>.apk`, then publish the draft.

## Patched widget library

`react-native-android-widget` is patched with `pnpm patch`: `patches/react-native-android-widget@0.22.1.patch`, listed under `patchedDependencies` in `pnpm-workspace.yaml` (pnpm 10 keeps it there, not in `package.json`). `pnpm install` applies it to `node_modules`, and the Android build compiles the library from there, so a clean prebuild needs nothing else. The patch gives every widget button its own `PendingIntent` request code (the library's millisecond codes made buttons drawn together cancel each other) and adds `receivedAt` to a click's data for the Tap log.

To change it:

```sh
pnpm patch react-native-android-widget@0.22.1 --edit-dir /tmp/rnaw   # a copy with the current patch applied
# edit the files under /tmp/rnaw
pnpm patch-commit /tmp/rnaw                                          # rewrites the patch file and reinstalls
```

Don't edit `node_modules` directly: the next install throws it away. After upgrading the library, rename the patch for the new version, run `pnpm install` and check that it still applies (pnpm fails loudly when it doesn't).

## Emulator

To test without a phone:

```sh
sdkmanager --install "emulator" "system-images;android-36;google_apis;arm64-v8a"
echo no | avdmanager create avd -n molly -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_9
$ANDROID_HOME/emulator/emulator -avd molly -no-boot-anim &
```

Inside the emulator the host computer is `10.0.2.2`, so the test Baby Buddy from `pnpm bb:up` is `http://10.0.2.2:4778`.
