package app.athan.daily;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "PrayerWidget")
public class PrayerWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String schedule = call.getString("schedule");
        if (schedule == null) { call.reject("Missing prayer schedule"); return; }
        try {
            new JSONObject(schedule).getJSONArray("prayers");
            getContext().getSharedPreferences("athan_widget", 0).edit().putString("schedule", schedule).apply();
            PrayerWidgetProvider.updateAll(getContext());
            call.resolve();
        } catch (Exception e) { call.reject("Could not update widget", e); }
    }
}
