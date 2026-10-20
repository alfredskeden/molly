// Signs release builds with the upload key from ~/.gradle/gradle.properties (see docs/android-build.md).
// A config plugin, so `expo prebuild --clean` can't drop it. Without the properties the release build
// fails instead of silently falling back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('MOLLY_UPLOAD_STORE_FILE')) {
                storeFile file(MOLLY_UPLOAD_STORE_FILE)
                storePassword MOLLY_UPLOAD_STORE_PASSWORD
                keyAlias MOLLY_UPLOAD_KEY_ALIAS
                keyPassword MOLLY_UPLOAD_KEY_PASSWORD
            }
        }`;

function replaceOnce(text, pattern, replacement, what) {
  if (!pattern.test(text)) throw new Error(`with-release-signing: ${what} not found in app/build.gradle`);
  return text.replace(pattern, replacement);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradle) => {
    let text = gradle.modResults.contents;
    if (text.includes('MOLLY_UPLOAD_STORE_FILE')) return gradle;
    text = replaceOnce(
      text,
      /(signingConfigs \{\n\s+debug \{[^}]*\})/,
      `$1${RELEASE_SIGNING}`,
      'signingConfigs.debug',
    );
    text = replaceOnce(
      text,
      /(release \{\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
      'buildTypes.release signingConfig',
    );
    gradle.modResults.contents = text;
    return gradle;
  });
};
