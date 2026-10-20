#!/usr/bin/env bash
# Builds the signed release APK locally. Setup: docs/android-build.md.
set -euo pipefail
cd "$(dirname "$0")/../apps/molly"

export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17)}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
"$JAVA_HOME/bin/java" -version 2>&1 | grep -q '"17' || { echo "JAVA_HOME must be a JDK 17: $JAVA_HOME" >&2; exit 1; }
[ -d "$ANDROID_HOME/platforms" ] || { echo "ANDROID_HOME has no SDK platforms: $ANDROID_HOME" >&2; exit 1; }
grep -q '^MOLLY_UPLOAD_STORE_FILE=' "$HOME/.gradle/gradle.properties" 2>/dev/null ||
  { echo "~/.gradle/gradle.properties has no MOLLY_UPLOAD_* signing properties (docs/android-build.md)" >&2; exit 1; }

npx expo prebuild -p android --clean
(cd android && ./gradlew assembleRelease)

apk="$PWD/android/app/build/outputs/apk/release/app-release.apk"
build_tools=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
"$build_tools/apksigner" verify --print-certs "$apk" | grep -E 'Signer #1 certificate (DN|SHA-256)'
echo "Signed APK: $apk"
echo "Install or update: adb install -r \"$apk\""
