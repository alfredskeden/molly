# Branches and releases

## Branches

- **`develop`** is where work lands, always through a pull request. Every pull request targets `develop`.
- **`main`** holds released code only. It changes through a release pull request from `develop` (or a hotfix, below), never by direct commits.

Each change goes on its own branch from `develop` and into a pull request opened with the GitHub CLI, with a description (what changed and why, how it was tested):

```sh
git switch develop && git pull && git switch -c <topic>
# commit, then
git push -u origin <topic>
gh pr create --base develop --title "<what changed>" --body "<what and why, how it was tested>"
```

Pull requests into `develop` are merged with **Squash and merge**. The squash commit takes the pull request's title and description as its message, so write the description for the history.

## Making a release

1. **Start from an up-to-date `develop`.**

   ```sh
   git switch develop && git pull
   git log --oneline origin/main..develop   # what the release contains
   ```

2. **Raise the version** in `apps/molly/app.json`: `expo.version` (shown in Settings) and `expo.android.versionCode` (a whole number, one higher than the last release; Android refuses an update with a lower one). Set `version` in `apps/molly/package.json` to the same version. Land it on `develop` like any change (a `release-<version>` branch, pull request titled `Bump version to <version>`, squash and merge), then `git pull` on `develop`.

3. **Check it.** `pnpm check` and `pnpm e2e` (test Baby Buddy up and seeded), then the Android checklist in `plans/implan-molly/phases/mvp/TEST_STRATEGY.md` on a release build (`pnpm android:release`).

4. **Open the release pull request** from `develop` to `main`:

   ```sh
   gh pr create --base main --head develop --title "Release <version>" \
     --body "$(git log --format='- %s' origin/main..develop)"
   ```

   Edit the body into release notes (what changed for the people using the app) before merging.

5. **Merge it with "Create a merge commit"** (`gh pr merge --merge`), not the squash button used for `develop`. A squash gives `main` a commit `develop` doesn't have, and every later release pull request would show old changes again or conflict. Don't tick "delete branch" here: the head branch is `develop`.

6. **Tag `main`** and push the tag:

   ```sh
   git switch main && git pull
   git tag v<version> && git push origin v<version>
   ```

7. **Build the APK from the tag** and publish the GitHub release (["Publishing a release"](android-build.md#publishing-a-release) in the Android build guide), with the release pull request's notes.

8. **Bring `develop` level with `main`** so the merge commit is in both: `git switch develop && git merge --ff-only main && git push` (a plain `git merge main` if `develop` has moved on since).

The web image needs no release step: build it from the tag (`pnpm web:image:pi` or `pnpm web:up` on a checkout of `v<version>`).

## Hotfixes

For a fix that can't wait for the next release: branch from `main` (`hotfix/<topic>`), raise the patch version, open the pull request against `main`, then follow steps 5–7. Afterwards merge `main` into `develop` so the fix isn't lost.
