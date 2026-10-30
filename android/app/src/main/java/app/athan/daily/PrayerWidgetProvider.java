package app.athan.daily;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class PrayerWidgetProvider extends AppWidgetProvider {
    public static final String REFRESH = "app.athan.daily.WIDGET_REFRESH";
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) { updateAll(context); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (REFRESH.equals(intent.getAction()) || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction()) || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())) updateAll(context);
    }
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        if (ids.length == 0) return;
        String name = "Set your location", clock = "Open Athan", location = "", zone = "UTC";
        long at = 0;
        try {
            JSONObject data = new JSONObject(context.getSharedPreferences("athan_widget", 0).getString("schedule", "{}"));
            location = data.optString("location", ""); zone = data.optString("timezone", "UTC");
            JSONArray prayers = data.optJSONArray("prayers");
            if (prayers != null) for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                if (p.getLong("at") > System.currentTimeMillis()) { name = p.getString("name"); at = p.getLong("at"); break; }
            }
            if (at > 0) { SimpleDateFormat format = new SimpleDateFormat("h:mm a", Locale.getDefault()); format.setTimeZone(TimeZone.getTimeZone(zone)); clock = format.format(new Date(at)); }
            else if (!location.isEmpty()) { name = "Refresh prayer times"; }
        } catch (Exception ignored) { }
        int background = R.drawable.widget_fajr;
        if (name.equals("Dhuhr")) background = R.drawable.widget_dhuhr;
        if (name.equals("Asr")) background = R.drawable.widget_asr;
        if (name.equals("Maghrib")) background = R.drawable.widget_maghrib;
        if (name.equals("Isha")) background = R.drawable.widget_isha;
        int foreground = Color.parseColor(name.equals("Isha") ? "#EEF2FA" : "#394338");
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.prayer_widget);
            views.setInt(R.id.widget_root, "setBackgroundResource", background);
            views.setTextViewText(R.id.widget_prayer, name); views.setTextViewText(R.id.widget_time, clock);
            views.setTextViewText(R.id.widget_location, location);
            for (int textId : new int[]{R.id.widget_label, R.id.widget_prayer, R.id.widget_time, R.id.widget_location}) views.setTextColor(textId, foreground);
            Intent launch = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id, views);
        }
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = PendingIntent.getBroadcast(context, 24, new Intent(context, PrayerWidgetProvider.class).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(pending);
        if (at > 0) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at + 1000, pending);
    }
}
