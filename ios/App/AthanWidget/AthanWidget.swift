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
struct PrayerWidgetView: View {
    let entry: PrayerEntry
    var night: Bool { entry.name == "Isha" }
    var colors: [Color] {
        switch entry.name {
        case "Fajr": return [Color(red:0.86,green:0.90,blue:0.94),Color(red:0.98,green:0.87,blue:0.79)]
        case "Dhuhr": return [Color(red:0.97,green:0.93,blue:0.78),Color(red:0.94,green:0.85,blue:0.63)]
        case "Maghrib": return [Color(red:0.92,green:0.79,blue:0.74),Color(red:0.91,green:0.64,blue:0.55)]
        case "Isha": return [Color(red:0.13,green:0.20,blue:0.31),Color(red:0.20,green:0.27,blue:0.42)]
        default: return [Color(red:0.89,green:0.92,blue:0.86),Color(red:0.79,green:0.84,blue:0.72)]
        }
    }
    var clock: String {
        guard let date = entry.at else { return "Refresh prayer times" }
        let formatter = DateFormatter(); formatter.timeStyle = .short; formatter.timeZone = TimeZone(identifier: entry.timezone)
        return formatter.string(from: date)
    }
    var body: some View {
        VStack(alignment:.leading,spacing:7) {
            HStack { Text("NEXT ATHAN").font(.system(size:10,weight:.medium)).tracking(2); Spacer(); Image(systemName:night ? "moon.stars" : "sun.max") }
            Text(entry.name).font(.system(size:29,design:.serif))
            HStack(alignment:.firstTextBaseline) { Text(clock).font(.system(size:21)); Spacer(); if let date = entry.at { Text(date,style:.relative).font(.caption) } }
            Text(entry.location).font(.caption2).lineLimit(1)
        }
        .foregroundStyle(night ? Color(red:0.93,green:0.95,blue:0.98) : Color(red:0.22,green:0.27,blue:0.22))
        .containerBackground(LinearGradient(colors:colors,startPoint:.topLeading,endPoint:.bottomTrailing),for:.widget)
    }
}
@main struct AthanWidget: Widget {
    let kind = "AthanNextPrayer"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind:kind,provider:PrayerProvider()) { PrayerWidgetView(entry:$0) }
            .configurationDisplayName("Athan — Next prayer")
            .description("Your next prayer, at a glance.")
            .supportedFamilies([.systemSmall,.systemMedium])
    }
}
