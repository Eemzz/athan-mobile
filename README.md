# Awtad

<img src="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png" alt="Awtad gold crescent and mountain wave icon" width="88">

A simple Android and iOS app for prayer times, athan reminders, and reading the Quran offline.

## Features

- Local prayer times and a countdown to the next athan
- Prayer reminders with athan audio or the phone's notification sound
- Five prayer themes, with a gold moon that follows the lunar phase in Isha
- Customizable small, large, and time marker widgets
- Lock screen widgets
- Offline Arabic Quran and English translation, with search and bookmarks


## Screenshots

| Today | Quran | Widget settings |
| --- | --- | --- |
| <img src="assets/screenshots/today.jpg" alt="Maghrib dashboard and daily prayer times" width="245"> | <img src="assets/screenshots/quran.jpg" alt="Quran reader with an Arabic ayah and English translation" width="245"> | <img src="assets/screenshots/widgets.jpg" alt="Large widget preview with font and opacity controls" width="245"> |

### Widget previews

| Small | Large | Time marker |
| --- | --- | --- |
| ![Small Isha widget](assets/screenshots/widget-small.jpg) | ![Large Isha widget](assets/screenshots/widget-large.jpg) | ![Time marker with countdown and progress bar](assets/screenshots/time-marker-preview.jpg) |


## Install

Clone the repository and run the setup commands below. Open `android/` in Android Studio and click **Run** with a phone or emulator selected. On macOS, run `npm run ios` and build in Xcode with your signing team and App Group configured for the app and widget.

After installing, choose a location and enable prayer reminders in **Settings → Alerts**. Add widgets from your phone's widget picker and customize them in **Settings → Widgets**.

## Development

Use Node.js 22.12+. Android builds also need Android Studio, SDK 36, and JDK 21. iOS builds need macOS and Xcode.

```sh
npm ci
npm run sync
npm run prepare:native
```

```sh
npm run dev    # Open the web preview
npm test       # Run tests
```

For a debug APK, run `./gradlew assembleDebug` inside `android/` (`gradlew.bat assembleDebug` on Windows). Find it at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Credits

Arabic Quran text: [Tanzil Project](https://tanzil.net), with [source and license notices](public/QURAN-LICENSE.txt). English translation: Marmaduke Pickthall. See [attributions](public/ATTRIBUTION.txt) for the audio and other bundled sources.
