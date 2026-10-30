# Build status — October 30, 2026

## Passed

- Production TypeScript / Vite build.
- Six automated prayer, search-normalization, notification-selection, and location-validation tests.
- Quran integrity: 114 surahs, 6,236 verses, every Arabic verse and English translation present, source notice retained per surah.
- Browser interaction checks: choose San Francisco, save location, see calculated prayer times and matching theme, browse Quran, search `2:255`, confirm the verse and translation.
- Android native compilation (`:app:assembleDebug`), including custom widget provider and Capacitor bridge.
- Android APK signing verification using `apksigner verify`.
- APK metadata: `app.athan.daily`, version 0.1.0, minimum SDK 24 (Android 7), target SDK 36.
- iOS project parses with App and AthanWidget targets, app-to-extension dependency, embedded widget, native bridge, shared app-group entitlements, and notification sound.

## Android deliverable

`../athan-android-debug.apk`: about 8.5 MiB. Debug-signed for testing. This is not a Play Store release build.

## Not verified on this Windows machine

- iOS compilation, signing, device installation, and TestFlight distribution. Use macOS/Xcode and your Apple developer team; instructions are in README.md.
- Physical-device Android and iOS permission prompts, actual background athan playback, exact-alarm behavior, reboot handling, device battery restrictions, and home-screen widget update timing.
- Native OS status-bar appearance on different phone models.

Scheduled iOS alerts use a 28-second athan excerpt; full playback is available inside the app. The app schedules up to 60 future reminders and shares 30 days of prayer times with widgets. Reopen the app regularly to refresh both.

## Framework choice

Capacitor uses the platform WebView rather than bundling a separate rendering engine. The custom UI is plain TypeScript/CSS with no component framework. The production main script is approximately 41 KB before gzip, plus small native-plugin adapters and the prayer library. Quran and athan assets are bundled for offline use. This is a lean implementation; no claim is made that it is the smallest possible native app across all frameworks or devices.
