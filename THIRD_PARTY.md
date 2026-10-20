# Third-party content

Molly's own code is under the MIT license ([`LICENSE`](LICENSE)). The content below is not Molly's and keeps its own terms.

## WHO Child Growth Standards

`packages/core/src/who-weight.ts` holds the WHO weight-for-age LMS parameters (girls and boys, birth to 5 years), taken from the WHO's expanded percentile tables at <https://www.who.int/tools/child-growth-standards/standards/weight-for-age>.

> WHO Multicentre Growth Reference Study Group. *WHO Child Growth Standards: Length/height-for-age, weight-for-age, weight-for-length, weight-for-height and body mass index-for-age: Methods and development.* Geneva: World Health Organization, 2006.

The WHO publishes this material under [CC BY-NC-SA 3.0 IGO](https://creativecommons.org/licenses/by-nc-sa/3.0/igo/). **This data is not covered by Molly's MIT license**: if you reuse it, credit the WHO, don't use it commercially, and share adaptations under the same license. The WHO does not endorse Molly. To use Molly commercially, replace this file with growth data you are allowed to use that way.

## Development guide

The age guide in `packages/core/src/development/` is written in Molly's own words from public health sources: 1177, Rikshandboken, Folkhälsomyndigheten, Livsmedelsverket (Sweden), the NHS (Open Government Licence v3.0), the CDC (public domain), the WHO and AAP HealthyChildren (linked only). Every entry cites its source; the full list, with links, is `packages/core/src/development/sources.ts`, and each source's reuse terms are in `plans/implan-development/NOTES.md` ("Licences"). None of these organisations endorses Molly.

Facts such as ages, schedules and ranges come from those sources; the wording is Molly's. The guide is general information, not medical advice.

## Fonts

The themes use Google Fonts through the `@expo-google-fonts/*` packages, all under the [SIL Open Font License 1.1](https://openfontlicense.org): Barlow, Bebas Neue, Chakra Petch, DM Serif Display, Fredoka, IBM Plex Sans, JetBrains Mono, Mulish, Nunito, Pixelify Sans, Quicksand, Sniglet, Space Mono and VT323. The font files are bundled into builds from `node_modules`, not stored in this repository.

## Libraries

npm dependencies are listed in each `package.json` and keep their own licenses. `patches/react-native-android-widget@0.22.1.patch` modifies [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget) (MIT).

## Baby Buddy

[Baby Buddy](https://github.com/babybuddy/babybuddy) (BSD-2-Clause) is a separate project. Molly talks to it over its REST API and includes none of its code. Molly is not affiliated with or endorsed by Baby Buddy.
