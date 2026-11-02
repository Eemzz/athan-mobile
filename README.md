# Athan for Android and iOS

A small Capacitor 8 app with plain TypeScript and CSS. No React, Flutter engine, Ionic UI library, account, API key, server, or tracking. The interface follows the approved mockup, with five prayer themes, a moving sun behind mountain layers, and a navy Isha theme.

## Included

- On-device prayer calculations using Batoul Apps Adhan. ISNA, Muslim World League, Umm al-Qura, Egyptian, and Karachi methods; Standard or Hanafi Asr.
- Device location, city presets, or custom coordinates with an explicit time zone. Location is stored locally.
- Live next-prayer countdown, today's prayer times, automatic themes, midnight rollover, and refresh when the app resumes.
- Native scheduled local notifications, athan/silent channels, per-prayer notification choices, and bundled athan audio.
- **Beautiful Adhan** plays in the app and prayer alerts, with a matching 28-second iOS excerpt. Older recording selections migrate automatically.
- Complete offline Arabic Quran and Pickthall English translation; all 114 surahs / 6,236 verses. Search Arabic (with or without vowel marks), English, surah names, or references such as `2:255`. Thirty verses per page. A saved verse reference can be bookmarked.
- Android home-screen widget and iOS WidgetKit extension, with themes and upcoming prayer times shared from the app. Android widgets refresh at the next prayer and periodically; iOS uses a timeline of upcoming prayer boundaries. The OS controls actual widget refresh timing.

## Run the interface

Requires Node.js 22+ (tested with Node 24).

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Scheduled notifications and home-screen widgets run only in the installed native apps. The browser preview does not pretend to schedule background alerts.

## Build and test

```sh
npm test
npm run sync
npm run prepare:native
```

Source organization: `src/app-template.ts` contains the screen markup, `src/settings.ts` restores preferences, and `src/quran.ts` loads and searches the Quran. Run `npm run format` before committing, or `npm run format:check` to check formatting. TypeScript also checks for unused declarations.

The Quran and audio assets are already included. `npm run prepare:data` refreshes them from their documented sources and validates the Quran verse count. FFmpeg is a development dependency used to prepare the audio, not part of the mobile runtime. On Windows behind a corporate proxy, `NODE_USE_SYSTEM_CA=1` may be needed for npm and the data preparation script.

Build output, caches, local IDE state, Capacitor-generated dependency wiring, and native audio copies are ignored by Git. After a fresh checkout, run `npm ci`, `npm run sync`, and `npm run prepare:native` before building either native project. Keep the original offline assets in `public/`, native source/project settings, and dependency lockfiles in version control.

### Offline asset packaging

Production builds store the Quran as lossless `quran.json.gz`, decompressed locally when the reader opens; all verses, translations, and source notices are preserved. Vite serves the same compressed endpoint during development. This uses the built-in `DecompressionStream` API in modern browsers and supported native WebViews, with no extra runtime dependency or network download.

The full Beautiful Adhan MP3 remains unchanged. Its iOS-only notification WAV is excluded from web assets and copied directly into the iOS app by `npm run prepare:native`. Android retains its native raw MP3 resource for notification channels as well as the web playback file. Source/license files remain bundled; only the source manifest's JSON whitespace is removed. Packaging tests enforce a web bundle below 2 MiB; APK/IPA size also includes native code and native notification sounds.

### Android: build from a fresh clone

Requires Node.js 22+, Android Studio, Android SDK 36, and JDK 21. For command-line builds, set `JAVA_HOME` and `ANDROID_HOME`; Android Studio can manage the SDK location locally.

From the repository root, run these commands before opening or building the Android project:

```sh
npm ci
npm run sync
npm run prepare:native
```

Open the repository's **`android` folder** in Android Studio, let Gradle sync, select an emulator or connected phone, and click **Run**.

Alternatively, build the APK from the command line:

```sh
cd android
./gradlew assembleDebug
```

On Windows use `gradlew.bat assembleDebug`. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Release builds require your own signing key; no private signing key is included. A debug APK is for local testing, not Play Store distribution.

After installing, set a location and enable notifications. On Android 12+, use **Allow precise reminders** in Settings to enable Alarms & reminders. Android 13+ also asks for notification permission. Notification channels respect the phone's sound, volume, Do Not Disturb, and battery policies. Add the widget using the launcher's widget picker.

### iOS

Requires macOS and a compatible Xcode version for Capacitor 8. iOS deployment target is 17.0. The iOS project is generated and includes the `AthanWidget` target, its embedded extension, a native bridge, a short notification sound, and app-group entitlements. It has not been compiled on Windows.

```sh
npm ci
npm run sync
npm run prepare:native
npm run ios
```

In Xcode, select your Apple development team for both **App** and **AthanWidget**. Use unique bundle identifiers if needed and register the App Group `group.app.athan.daily` for both targets. If changing the group, update both entitlements plus the group string in `PrayerWidgetPlugin.swift` and `AthanWidget.swift`. Build/run on a device, allow notifications, and add the widget from the home screen. Distribution/TestFlight requires your Apple account and signing.

## Time marker widget

Add **Athan - Time marker** from the Android widget picker (2 × 1), or **Athan — Time marker** in the iPhone widget gallery (medium). In the app, open **Settings → Time marker widget** to choose automatic/light/dark/custom text, a background color, and 0–100% transparency. These preferences apply to all copies of the Time marker; the landscape widgets keep their existing appearance. Automatic text follows the device appearance, not the wallpaper. iOS may override backgrounds and colors in tinted or clear Home Screen modes. Widget refresh timing remains controlled by the OS.

## Platform limits

- iOS notification sounds must be shorter than 30 seconds. This app bundles a 28-second athan excerpt for scheduled iOS notifications; the full recording is playable in the app. It does not claim to play a full three-minute athan automatically while a terminated iOS app is closed.
- A maximum of 60 future reminders are scheduled to stay below iOS's pending-notification limit. Normally this covers about 12 days. Open the app regularly to refresh the window. Settings displays the last scheduled date.
- Widgets cache 30 days of calculations. When data expires, they ask the user to reopen Athan. They update locally; no server wakes the app in the background.
- Location is updated when requested, not tracked in the background. If travelling or changing the phone time zone, reopen the app and update the location/time zone.
- Exact alarm access, sound playback, reboot recovery, widget timing, battery restrictions, and permission denial need verification on physical Android and iOS devices before release. Web tests cannot verify those OS behaviors.

## Data and credits

Arabic Quran: [Tanzil Project](https://tanzil.net), CC BY 3.0 with verbatim copying terms. Arabic verse text is preserved unchanged; its source notice is retained in each surah. English: Marmaduke Pickthall's 1930 translation, public domain. Retrieved from [Quran JSON](https://quran-json.risanb.com/) with its [source/licensing manifest](https://quran-json.risanb.com/meta/sources.json). Included copies: `public/QURAN-LICENSE.txt`, `public/quran-sources.json`.

Athan: **Beautiful Adhan** by Adam-synagda (2022), [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Converted to mono 22.05 kHz MP3, with matching 16 kHz WAV excerpts trimmed to 28 seconds for iOS. Attribution is included in the app and `public/ATTRIBUTION.txt`.

Prayer calculations: [Adhan by Batoul Apps](https://github.com/batoulapps/adhan-js), MIT. Icons: [Lucide](https://lucide.dev/license), ISC. Native runtime: [Capacitor](https://capacitorjs.com/docs). This app has no affiliation with those projects or the reciter.

## Verification

`npm test` checks five-prayer ordering, midnight rollover, foreign time zones, Hanafi Asr, notification limits/muting, Arabic search normalization, and location validation. `npm run build` checks TypeScript and creates production assets. Browser QA covers location setup, calculated prayer display, Quran navigation, and verse-reference search. See `BUILD-STATUS.md` for native build results and remaining device checks.
