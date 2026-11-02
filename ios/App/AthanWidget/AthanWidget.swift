import SwiftUI
import WidgetKit

struct StoredPrayer: Decodable { let name: String; let at: Double }
struct StoredMarker: Decodable {
    var textMode: String = "automatic"
    var textColor: String = "#516a58"
    var backgroundColor: String = "#ffffff"
    var transparency: Double = 100
}
struct StoredSchedule: Decodable { let location: String; let timezone: String; let prayers: [StoredPrayer]; let marker: StoredMarker? }
struct PrayerEntry: TimelineEntry { let date: Date; let name: String; let at: Date?; let location: String; let timezone: String; var marker: StoredMarker = StoredMarker(); var previous: StoredPrayer? = nil }
struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry { PrayerEntry(date: Date(), name: "Asr", at: Date().addingTimeInterval(2400), location: "Your location", timezone: TimeZone.current.identifier) }
    func entry(at date: Date, schedule: StoredSchedule?) -> PrayerEntry {
        let next = schedule?.prayers.first(where: { $0.at / 1000 > date.timeIntervalSince1970 })
        return PrayerEntry(date: date, name: next?.name ?? "Open Athan", at: next.map { Date(timeIntervalSince1970: $0.at / 1000) }, location: schedule?.location ?? "Set your location", timezone: schedule?.timezone ?? TimeZone.current.identifier, marker: schedule?.marker ?? StoredMarker(), previous: schedule?.prayers.last(where: { $0.at / 1000 <= date.timeIntervalSince1970 }))
    }
    func load() -> StoredSchedule? {
        guard let value = UserDefaults(suiteName: "group.app.athan.daily")?.string(forKey: "prayerSchedule"), let data = value.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(StoredSchedule.self, from: data)
    }
    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) { completion(context.isPreview ? placeholder(in: context) : entry(at: Date(), schedule: load())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let now = Date(); let schedule = load()
        let dates = (schedule?.prayers ?? []).filter { $0.at / 1000 > now.timeIntervalSince1970 }.prefix(70).map { Date(timeIntervalSince1970: $0.at / 1000 + 1) }
        let minutes = (1...60).map { now.addingTimeInterval(Double($0) * 60) }
        let entries = Array(Set([now] + dates + minutes)).sorted().map { entry(at: $0, schedule: schedule) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(3600))))
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
    let small: Bool

    var body: some View {
        Canvas { context, size in
            let bounds = CGRect(origin: .zero, size: size)
            // Match Android's gradient, with equal horizontal and vertical contributions.
            let denominator = 1 / (size.width * size.width) + 1 / (size.height * size.height)
            let gradientEnd = CGPoint(x: 2 / size.width / denominator, y: 2 / size.height / denominator)
            context.fill(Path(bounds), with: .linearGradient(Gradient(colors: theme.sky), startPoint: .zero, endPoint: gradientEnd))
            let center = CGPoint(x: theme.position.x * size.width, y: theme.position.y * size.height)
            let scale = size.height / 90
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
                for point in [CGPoint(x: small ? 98 : 108, y: 17), CGPoint(x: 163, y: 12), CGPoint(x: small ? 111 : 121, y: 38), CGPoint(x: 169, y: 44)] {
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
    @Environment(\.widgetFamily) private var family
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
        VStack(alignment: family == .systemSmall ? .center : .leading, spacing: family == .systemSmall ? 4 : 1) {
            Text("NEXT PRAYER")
                .font(.system(size: family == .systemMedium ? 10 : 11, weight: .regular, design: .default))
            Text(entry.name)
                .font(.custom("Georgia-Bold", size: family == .systemMedium ? 36 : 40))
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            Text(clock)
                .font(.system(size: family == .systemMedium ? 17 : 20, weight: .regular, design: .default))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: family == .systemSmall ? .center : .leading)
        .padding(.leading, family == .systemSmall ? 12 : 20)
        .padding(.trailing, family == .systemSmall ? 12 : 8)
        .padding(.vertical, 4)
        .foregroundStyle(Color(widgetHex: theme.night ? 0xEEF2FA : 0x394338))
        .containerBackground(for: .widget) { WidgetLandscape(theme: theme, small: family == .systemSmall) }
        .accessibilityElement(children: .combine)
    }
}
struct AthanWidget: Widget {
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

private struct TimeMarkerView: View {
    @Environment(\.colorScheme) private var colorScheme
    let entry: PrayerEntry
    private func color(_ hex: String, fallback: UInt32) -> Color {
        Color(widgetHex: UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? fallback)
    }
    private var ink: Color {
        switch entry.marker.textMode {
        case "custom": return color(entry.marker.textColor, fallback: 0x516A58)
        case "light": return Color(widgetHex: 0xF4F5F7)
        case "dark": return Color(widgetHex: 0x263239)
        default: return Color(widgetHex: colorScheme == .dark ? 0xF4F5F7 : 0x263239)
        }
    }
    private var icon: String {
        switch entry.name { case "Fajr": return "sunrise"; case "Maghrib": return "sunset"; case "Isha": return "moon"; default: return "sun.max" }
    }
    private func clock(_ date: Date?) -> String {
        guard let date else { return "Open Athan" }
        let f = DateFormatter(); f.timeStyle = .short; f.timeZone = TimeZone(identifier: entry.timezone)
        return f.string(from: date)
    }
    private var progress: Double {
        guard let next = entry.at, let previous = entry.previous else { return 0 }
        let start = Date(timeIntervalSince1970: previous.at / 1000)
        return max(0, min(1, entry.date.timeIntervalSince(start) / max(1, next.timeIntervalSince(start))))
    }
    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("NEXT PRAYER").font(.system(size: 9, weight: .medium)).tracking(1.2).opacity(0.76)
                    HStack(spacing: 10) {
                        Text(entry.name).font(.custom("Georgia-Bold", size: 34)).lineLimit(1).minimumScaleFactor(0.6)
                        Image(systemName: icon).font(.system(size: 19, weight: .light))
                    }
                }
                Spacer(minLength: 12)
                VStack(alignment: .trailing, spacing: 3) {
                    Text(clock(entry.at)).font(.system(size: 19)).lineLimit(1).minimumScaleFactor(0.7)
                    if let at = entry.at { Text(at, style: .relative).font(.system(size: 11)).opacity(0.76) }
                }
            }
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(ink.opacity(0.2)).frame(height: 2)
                    Capsule().fill(ink).frame(width: geometry.size.width * progress, height: 2)
                    Circle().fill(ink).frame(width: 6, height: 6).offset(x: max(0, min(geometry.size.width - 6, geometry.size.width * progress - 3)))
                }.frame(maxHeight: .infinity)
            }.frame(height: 6)
            HStack {
                Text(entry.previous.map { $0.name + " · " + clock(Date(timeIntervalSince1970: $0.at / 1000)) } ?? "Next prayer")
                Spacer(minLength: 8)
                Text(entry.name + " · " + clock(entry.at))
            }.font(.system(size: 10)).opacity(0.76).lineLimit(1).minimumScaleFactor(0.75)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(ink)
        .containerBackground(for: .widget) {
            color(entry.marker.backgroundColor, fallback: 0xFFFFFF).opacity(1 - max(0, min(100, entry.marker.transparency)) / 100)
        }
    }
}
struct TimeMarkerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AthanTimeMarker", provider: PrayerProvider()) { TimeMarkerView(entry: $0) }
            .configurationDisplayName("Athan — Time marker")
            .description("Next prayer, progress, and your choice of colors.")
            .supportedFamilies([.systemMedium])
            .contentMarginsDisabled()
    }
}
@main struct AthanWidgetBundle: WidgetBundle {
    var body: some Widget { AthanWidget(); TimeMarkerWidget() }
}
