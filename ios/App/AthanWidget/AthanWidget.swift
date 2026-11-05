import SwiftUI
import WidgetKit

struct StoredMoon: Decodable { let at: Double; let fraction: Double; let waxing: Bool; let name: String }
struct StoredPrayer: Decodable { let name: String; let at: Double }
struct StoredMarker: Decodable {
    var textMode: String = "automatic"
    var textColor: String = "#516a58"
    var backgroundColor: String = "#ffffff"
    var transparency: Double = 100
    var fontFamily: String? = nil
}
struct LandscapeStyle: Decodable { var fontFamily: String? = nil; var opacity: Double? = nil }
struct LandscapeStyles: Decodable { let small: LandscapeStyle?; let large: LandscapeStyle? }
struct StoredSchedule: Decodable { let location: String; let timezone: String; let prayers: [StoredPrayer]; let marker: StoredMarker?; let landscape: LandscapeStyles?; let moons: [StoredMoon]? }
struct PrayerEntry: TimelineEntry { let date: Date; let name: String; let at: Date?; let location: String; let timezone: String; var marker: StoredMarker = StoredMarker(); var previous: StoredPrayer? = nil; var landscape: LandscapeStyles? = nil; var moon: StoredMoon? = nil }
struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry { PrayerEntry(date: Date(), name: "Asr", at: Date().addingTimeInterval(2400), location: "Your location", timezone: TimeZone.current.identifier) }
    func entry(at date: Date, schedule: StoredSchedule?) -> PrayerEntry {
        let next = schedule?.prayers.first(where: { $0.at / 1000 > date.timeIntervalSince1970 })
        return PrayerEntry(date: date, name: next?.name ?? "Open Athan", at: next.map { Date(timeIntervalSince1970: $0.at / 1000) }, location: schedule?.location ?? "Set your location", timezone: schedule?.timezone ?? TimeZone.current.identifier, marker: schedule?.marker ?? StoredMarker(), previous: schedule?.prayers.last(where: { $0.at / 1000 <= date.timeIntervalSince1970 }), landscape: schedule?.landscape, moon: schedule?.moons?.last(where: { $0.at / 1000 <= date.timeIntervalSince1970 }))
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
            let originalCenter = CGPoint(x: theme.position.x * size.width, y: theme.position.y * size.height)
            let scale = size.height / 90
            let radius = (size.height / 90) * (theme.night ? (small ? 8 : 11) : 16)
            let center = theme.night && small ? CGPoint(x: originalCenter.x, y: size.height * 12 / 90) : originalCenter
            let disk = Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
            if theme.night {
                context.fill(disk, with: .color(theme.orb.opacity(0.12)))
                context.fill(MoonIllumination(moon: moon).path(in: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)), with: .color(theme.orb))
                let stars: [(CGFloat, CGFloat, CGFloat, Double)] = [(18,12,0.45,0.45),(45,8,0.65,0.7),(76,15,1,1),(108,9,0.45,0.45),(159,10,0.65,0.7),(167,29,0.45,0.45),(24,32,0.65,0.7),(57,27,0.45,0.45),(93,34,0.8,0.9),(115,46,0.45,0.45),(158,51,0.8,0.9),(17,56,0.45,0.45),(46,49,1.05,1),(76,60,0.45,0.45),(101,62,0.65,0.7),(169,61,0.45,0.45)]
                for (x, y, dotRadius, opacity) in stars {
                    let point = CGPoint(x: x / 180 * size.width, y: y / 90 * size.height)
                    let r = max(1 / 3, scale * dotRadius)
                    if hypot(point.x - center.x, point.y - center.y) < radius + r + scale * 2 { continue }
                    let star = CGRect(x: point.x - r, y: point.y - r, width: r * 2, height: r * 2)
                    context.fill(Path(ellipseIn: star), with: .color(Color(widgetHex: 0xB4C9ED).opacity(opacity)))
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
    private var appearance: LandscapeStyle { (family == .systemSmall ? entry.landscape?.small : entry.landscape?.large) ?? LandscapeStyle() }
    private var fontDesign: Font.Design { appearance.fontFamily == "sans-serif" ? .default : .serif }
    private var theme: WidgetTheme { WidgetTheme(prayer: entry.name) }
    private var clock: String {
        guard let date = entry.at else { return "Set your location" }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.timeZone = TimeZone(identifier: entry.timezone)
        return formatter.string(from: date)
    }
    var body: some View {
        GeometryReader { geometry in
        let moonRadius = geometry.size.height / 90 * 11
        VStack(alignment: family == .systemSmall ? .center : .leading, spacing: family == .systemSmall ? 4 : 1) {
            Text("NEXT PRAYER")
                .font(.system(size: family == .systemMedium ? 10 : 11, weight: .regular, design: fontDesign))
            Text(entry.name)
                .font(.system(size: family == .systemMedium ? 36 : 40, weight: .bold, design: fontDesign))
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            Text(clock)
                .font(.system(size: family == .systemMedium ? 17 : 20, weight: .regular, design: fontDesign))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: family == .systemSmall ? .center : .leading)
        .padding(.leading, family == .systemSmall ? 12 : 20)
        .padding(.trailing, family == .systemSmall ? 12 : theme.night ? geometry.size.width * (1 - 140.0 / 180) + moonRadius + 8 : 8)
        .padding(.top, 4)
        .padding(.bottom, 4)
        .foregroundStyle(Color(widgetHex: theme.night ? 0xEEF2FA : 0x394338))
        .containerBackground(for: .widget) { WidgetLandscape(theme: theme, small: family == .systemSmall, moon: entry.moon).opacity(max(0, min(100, appearance.opacity ?? 100)) / 100) }
        .accessibilityElement(children: .combine)
        }
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
    private func font(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: entry.marker.fontFamily == "sans-serif" ? .default : .serif)
    }
    var body: some View {
        GeometryReader { bounds in
        let scale = min(bounds.size.width / 300, bounds.size.height / 130)
        VStack(spacing: 0) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("NEXT PRAYER").font(font(11 * scale, weight: .medium)).tracking(1.2).opacity(1)
                    HStack(spacing: 10) {
                        Text(entry.name).font(font(38 * scale, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                        if entry.name == "Isha" { PhaseMoon(moon: entry.moon).frame(width: 19, height: 19) } else { Image(systemName: icon).font(.system(size: 19, weight: .light)) }
                    }
                }
                Spacer(minLength: 12)
                VStack(alignment: .trailing, spacing: 3) {
                    Text(clock(entry.at)).font(font(22 * scale)).lineLimit(1).minimumScaleFactor(0.7)
                    if let at = entry.at { Text(at, style: .relative).font(font(12 * scale)).opacity(1) }
                }
            }
            Spacer(minLength: 6)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(ink.opacity(0.2)).frame(height: 2)
                    Capsule().fill(ink).frame(width: geometry.size.width * progress, height: 2)
                    Circle().fill(ink).frame(width: 6, height: 6).offset(x: max(0, min(geometry.size.width - 6, geometry.size.width * progress - 3)))
                }.frame(maxHeight: .infinity)
            }.frame(height: 6)
            Spacer(minLength: 6)
            HStack {
                Text(entry.previous.map { $0.name + " · " + clock(Date(timeIntervalSince1970: $0.at / 1000)) } ?? "Next prayer")
                Spacer(minLength: 8)
                Text(entry.name + " · " + clock(entry.at))
            }.font(font(12 * scale)).opacity(1).lineLimit(1).minimumScaleFactor(0.75)
        }
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
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
    var body: some Widget { AthanWidget(); TimeMarkerWidget(); LockScreenPrayerWidget() }
}





private struct LockScreenPrayerView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry
    private var icon: String {
        switch entry.name {
        case "Fajr": return "sunrise"
        case "Maghrib": return "sunset"
        case "Isha": return "moon"
        default: return "sun.max"
        }
    }
    private var clock: String {
        guard let date = entry.at else { return "Open app" }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.timeZone = TimeZone(identifier: entry.timezone)
        return formatter.string(from: date)
    }
    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline:
            if entry.name == "Isha" { Text("\(entry.name) · \(clock)") } else { Label("\(entry.name) · \(clock)", systemImage: icon) }
        case .accessoryCircular:
            VStack(spacing: 2) {
                if entry.name == "Isha" { PhaseMoon(moon: entry.moon).frame(width: 13, height: 13) } else { Image(systemName: icon).font(.system(size: 13)) }
                Text(entry.name).font(.system(size: 13, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                Text(clock).font(.system(size: 10, weight: .medium)).lineLimit(1).minimumScaleFactor(0.6)
            }
        default:
            HStack(spacing: 8) {
                if entry.name == "Isha" { PhaseMoon(moon: entry.moon).frame(width: 22, height: 22) } else { Image(systemName: icon).font(.system(size: 22, weight: .light)) }
                VStack(alignment: .leading, spacing: 2) {
                    Text("NEXT PRAYER").font(.system(size: 9, weight: .medium)).tracking(1)
                    Text(entry.name).font(.system(size: 20, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                    Text(clock).font(.system(size: 13, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    var body: some View {
        content
            .containerBackground(for: .widget) { Color.clear }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Next prayer: \(entry.name), \(clock)")
    }
}
struct LockScreenPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AthanLockScreen", provider: PrayerProvider()) { LockScreenPrayerView(entry: $0) }
            .configurationDisplayName("Athan — Lock screen")
            .description("Your next prayer and its time on the Lock Screen.")
            .supportedFamilies([.accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}


private struct IconMoon: Shape {
 func path(in rect: CGRect) -> Path {
 var path = Path()
 path.move(to: CGPoint(x: 38.4375, y: 3.125))
 path.addCurve(to: CGPoint(x: 86.8634, y: 34.3723), control1: CGPoint(x: 59.83218, y: 1.21532), control2: CGPoint(x: 79.7873, y: 14.09156))
 path.addCurve(to: CGPoint(x: 68.38676, y: 88.96237), control1: CGPoint(x: 93.93949, y: 54.65304), control2: CGPoint(x: 86.32572, y: 77.14826))
 path.addCurve(to: CGPoint(x: 10.9375, y: 84.375), control1: CGPoint(x: 50.4478, y: 100.77647), control2: CGPoint(x: 26.77437, y: 98.88613))
 path.addCurve(to: CGPoint(x: 57.94646, y: 55.00688), control1: CGPoint(x: 31.60079, y: 87.02647), control2: CGPoint(x: 51.26757, y: 74.73996))
 path.addCurve(to: CGPoint(x: 38.4375, y: 3.125), control1: CGPoint(x: 64.62535, y: 35.2738), control2: CGPoint(x: 56.46353, y: 13.56838))
 path.closeSubpath()
 let scale = min(rect.width, rect.height) / 100
 return path.applying(CGAffineTransform(scaleX: scale, y: scale).concatenating(CGAffineTransform(translationX: rect.midX - 50 * scale, y: rect.midY - 50 * scale)))
 }
}




private struct MoonIllumination: Shape {
    let moon: StoredMoon?
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let fraction = moon?.fraction ?? 0.25
        let side: Double = (moon?.waxing ?? true) ? 1 : -1
        for j in 0...1 { for i in 0...64 {
            let angle = j == 0 ? -Double.pi/2 + Double(i)*Double.pi/64 : Double.pi/2 - Double(i)*Double.pi/64
            let x = 0.5 + side*0.46*(j == 0 ? 1 : 1-2*fraction)*cos(angle)
            let y = 0.5 + 0.46*sin(angle)
            let point = CGPoint(x: rect.minX + CGFloat(x)*rect.width, y: rect.minY + CGFloat(y)*rect.height)
            if j == 0 && i == 0 { path.move(to: point) } else { path.addLine(to: point) }
        } }
        path.closeSubpath()
        return path
    }
}
private struct PhaseMoon: View {
    let moon: StoredMoon?
    var body: some View {
        ZStack { Circle().inset(by: 0).opacity(0.12).scaleEffect(0.92); MoonIllumination(moon: moon).fill() }
    }
}
