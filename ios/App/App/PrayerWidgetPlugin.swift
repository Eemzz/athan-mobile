import Capacitor
import WidgetKit

@objc(PrayerWidgetPlugin)
public class PrayerWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrayerWidgetPlugin"
    public let jsName = "PrayerWidget"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)]
    @objc func update(_ call: CAPPluginCall) {
        guard let value = call.getString("schedule"), let data = value.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: data)) != nil,
              let shared = UserDefaults(suiteName: "group.app.athan.daily") else {
            call.reject("Unable to save widget schedule"); return
        }
        shared.set(value, forKey: "prayerSchedule")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}

class AthanViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(PrayerWidgetPlugin()) }
}
