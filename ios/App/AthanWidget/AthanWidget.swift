import SwiftUI
import WidgetKit

struct StoredPrayer: Decodable { let name: String; let at: Double }
struct StoredSchedule: Decodable { let location: String; let timezone: String; let prayers: [StoredPrayer] }
struct PrayerEntry: TimelineEntry { let date: Date; let name: String; let at: Date?; let location: String; let timezone: String }
struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry { PrayerEntry(date: Date(), name: "Asr", at: Date().addingTimeInterval(2400), location: "Your location", timezone: TimeZone.current.identifier) }
    func entry(at date: Date, schedule: StoredSchedule?) -> PrayerEntry {
        let next = schedule?.prayers.first(where: { $0.at / 1000 > date.timeIntervalSince1970 })
        return PrayerEntry(date: date, name: next?.name ?? "Open Athan", at: next.map { Date(timeIntervalSince1970: $0.at / 1000) }, location: schedule?.location ?? "Set your location", timezone: schedule?.timezone ?? TimeZone.current.identifier)
    }
    func load() -> StoredSchedule? {
        guard let value = UserDefaults(suiteName: "group.app.athan.daily")?.string(forKey: "prayerSchedule"), let data = value.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(StoredSchedule.self, from: data)
    }
    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) { completion(context.isPreview ? placeholder(in: context) : entry(at: Date(), schedule: load())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let now = Date(); let schedule = load()
        let dates = (schedule?.prayers ?? []).filter { $0.at / 1000 > now.timeIntervalSince1970 }.prefix(70).map { Date(timeIntervalSince1970: $0.at / 1000 + 1) }
        let entries = ([now] + dates).map { entry(at: $0, schedule: schedule) }
        completion(Timeline(entries: entries, policy: .after(dates.last ?? now.addingTimeInterval(3600))))
    }
}
private extension Color {
    init(widgetHex value: UInt32) {
        self.init(.sRGB, red: Double((value >> 16) & 255) / 255,
                  green: Double((value >> 8) & 255) / 255,
                  blue: Double(value & 255) / 255, opacity: 1)
    }
}

private struct WidgetTheme {
    let sky: [Color]
    let hill: Color
    let orb: Color
    let position: CGPoint
    let night: Bool

    init(prayer: String) {
        night = prayer == "Isha"
        let values: (UInt32, UInt32, UInt32, UInt32, CGFloat, CGFloat)
        switch prayer {
        case "Fajr": values = (0xDCE6F0, 0xF9DFC9, 0xBDC8C4, 0xFFF3D5, 120, 75)
        case "Dhuhr": values = (0xF7EDC8, 0xEFDAA0, 0xD5C390, 0xFFF8D3, 137, 20)
        case "Maghrib": values = (0xEBC9BC, 0xE8A48C, 0xBB8585, 0xFFDBAD, 162, 76)
        case "Isha": values = (0x223350, 0x34466B, 0x1C2B44, 0xE6ECF7, 140, 30)
        default: values = (0xE4EADB, 0xC9D5B7, 0xA7BB95, 0xF8F0C9, 150, 47)
        }
        sky = [Color(widgetHex: values.0), Color(widgetHex: values.1)]
        hill = Color(widgetHex: values.2)
        orb = Color(widgetHex: values.3)
        position = CGPoint(x: values.4 / 180, y: values.5 / 90)
    }
}

private struct WidgetLandscape: View {
    let theme: WidgetTheme

    var body: some View {
        Canvas { context, size in
            let bounds = CGRect(origin: .zero, size: size)
            // Match Android's gradient, with equal horizontal and vertical contributions.
            let denominator = 1 / (size.width * size.width) + 1 / (size.height * size.height)
            let gradientEnd = CGPoint(x: 2 / size.width / denominator, y: 2 / size.height / denominator)
            context.fill(Path(bounds), with: .linearGradient(Gradient(colors: theme.sky), startPoint: .zero, endPoint: gradientEnd))
            let center = CGPoint(x: theme.position.x * size.width, y: theme.position.y * size.height)
            let scale = min(size.width / 180, size.height / 90)
            let radius = (size.height / 90) * (theme.night ? 11 : 16)
            let disk = Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
            if theme.night {
                // Remove a circle on an isolated layer to form a crescent without erasing the sky.
                context.drawLayer { moon in
                    moon.fill(disk, with: .color(theme.orb))
                    moon.blendMode = .destinationOut
                    let cutRadius = radius * 0.95
                    let cutCenter = CGPoint(x: center.x + radius * 0.7, y: center.y - radius * 0.4)
                    moon.fill(Path(ellipseIn: CGRect(x: cutCenter.x - cutRadius, y: cutCenter.y - cutRadius, width: cutRadius * 2, height: cutRadius * 2)), with: .color(.white))
                }
                for point in [CGPoint(x: 108, y: 17), CGPoint(x: 163, y: 12), CGPoint(x: 121, y: 38), CGPoint(x: 169, y: 44)] {
                    let star = CGRect(x: point.x / 180 * size.width, y: point.y / 90 * size.height, width: max(1, scale), height: max(1, scale))
                    context.fill(Path(ellipseIn: star), with: .color(Color(widgetHex: 0xB4C9ED)))
                }
            } else {
                context.fill(disk, with: .color(theme.orb))
            }
            // Mountains are painted last so the dawn and sunset sit behind the horizon.
            let points = [CGPoint(x: 0, y: 78), CGPoint(x: 28, y: 77), CGPoint(x: 51, y: 81), CGPoint(x: 89, y: 76), CGPoint(x: 117, y: 67), CGPoint(x: 142, y: 72), CGPoint(x: 180, y: 61), CGPoint(x: 180, y: 90), CGPoint(x: 0, y: 90)]
            var mountains = Path()
            for (index, point) in points.enumerated() {
                let point = CGPoint(x: point.x / 180 * size.width, y: point.y / 90 * size.height)
                if index == 0 { mountains.move(to: point) } else { mountains.addLine(to: point) }
            }
            mountains.closeSubpath()
            context.fill(mountains, with: .color(theme.hill))
        }
        .accessibilityHidden(true)
    }
}

struct PrayerWidgetView: View {
    let entry: PrayerEntry
    private var theme: WidgetTheme { WidgetTheme(prayer: entry.name) }
    private var clock: String {
        guard let date = entry.at else { return "Set your location" }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.timeZone = TimeZone(identifier: entry.timezone)
        return formatter.string(from: date)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("NEXT PRAYER")
                .font(.system(size: 8, weight: .regular, design: .default))
            Text(entry.name)
                .font(.system(size: 28, weight: .bold, design: .default))
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            Text(clock)
                .font(.system(size: 13, weight: .regular, design: .default))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.leading, 12)
        .padding(.trailing, 8)
        .padding(.vertical, 4)
        .foregroundStyle(Color(widgetHex: theme.night ? 0xEEF2FA : 0x394338))
        .containerBackground(for: .widget) { WidgetLandscape(theme: theme) }
        .accessibilityElement(children: .combine)
    }
}
@main struct AthanWidget: Widget {
    let kind = "AthanNextPrayer"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind:kind,provider:PrayerProvider()) { PrayerWidgetView(entry:$0) }
            .configurationDisplayName("Athan — Next prayer")
            .description("Your next prayer, at a glance.")
            .supportedFamilies([.systemSmall,.systemMedium])
            .contentMarginsDisabled()
            .containerBackgroundRemovable(false)
    }
}
