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
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, android.os.Bundle options) { updateAll(context); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (REFRESH.equals(intent.getAction()) || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction()) || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())) updateAll(context);
    }
    private static CharSequence styled(String text, String font, boolean bold) {
        android.text.SpannableString value = new android.text.SpannableString(text);
        value.setSpan(new android.text.style.TypefaceSpan(font),0,text.length(),0);
        value.setSpan(new android.text.style.StyleSpan(bold ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL),0,text.length(),0);
        return value;
    }
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] smallIds = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        int[] largeIds = manager.getAppWidgetIds(new ComponentName(context, LargePrayerWidgetProvider.class));
        int[] markerIds = manager.getAppWidgetIds(new ComponentName(context, TimeMarkerWidgetProvider.class));
        int[] ids = new int[smallIds.length + largeIds.length + markerIds.length];
        System.arraycopy(smallIds, 0, ids, 0, smallIds.length);
        System.arraycopy(largeIds, 0, ids, smallIds.length, largeIds.length);
        System.arraycopy(markerIds, 0, ids, smallIds.length + largeIds.length, markerIds.length);
        if (ids.length == 0) return;
        String name = "Set your location", clock = "Open Athan", location = "", zone = "UTC";
        JSONObject landscapeAppearance = new JSONObject();
        long at = 0;
        try {
            JSONObject data = new JSONObject(context.getSharedPreferences("athan_widget", 0).getString("schedule", "{}"));
            if (data.optJSONObject("landscape") != null) landscapeAppearance = data.optJSONObject("landscape");
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
            if (manager.getAppWidgetInfo(id).provider.getClassName().equals(TimeMarkerWidgetProvider.class.getName())) {
                RemoteViews markerViews = MarkerWidgetRenderer.views(context, manager, id);
                Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                markerViews.setOnClickPendingIntent(R.id.marker_root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
                manager.updateAppWidget(id, markerViews);
                continue;
            }
            boolean small = !manager.getAppWidgetInfo(id).provider.getClassName().equals(LargePrayerWidgetProvider.class.getName());
            RemoteViews views = new RemoteViews(context.getPackageName(), small ? R.layout.prayer_widget : R.layout.prayer_widget_large);
            JSONObject appearance = landscapeAppearance.optJSONObject(small ? "small" : "large");
            if (appearance == null) appearance = new JSONObject();
            String font = appearance.optString("fontFamily", "serif").equals("sans-serif") ? "sans-serif" : "serif";
            int opacity = Math.max(0, Math.min(100, appearance.optInt("opacity",100)));
            views.setInt(R.id.widget_root, "setBackgroundResource", 0);
            views.setTextViewText(R.id.widget_prayer, name); views.setTextViewText(R.id.widget_time, clock);
            if (small) SmallWidgetSizing.apply(context, manager, id, views, name, clock, font);
            else if (name.equals("Isha")) {
                android.os.Bundle options=manager.getAppWidgetOptions(id);
                boolean landscape=context.getResources().getConfiguration().orientation==2;
                float width=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH:AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,180);
                float height=options.getInt(landscape?AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT:AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,90);
                float density=context.getResources().getDisplayMetrics().density;
                float right=width*(1-140f/180)+height/90f*11+8;
                views.setViewPadding(R.id.widget_content,Math.round(20*density),Math.round(4*density),Math.round(right*density),Math.round(4*density));
            }
            views.setImageViewBitmap(R.id.widget_scene, WidgetArtwork.render(context, manager, id, name, small, opacity));
            views.setTextViewText(R.id.widget_label, styled("NEXT ATHAN", "sans-serif", false));
            views.setTextViewText(R.id.widget_prayer, styled(name, font, true));
            views.setTextViewText(R.id.widget_time, styled(clock, font, false));
            for (int textId : new int[]{R.id.widget_label, R.id.widget_prayer, R.id.widget_time}) views.setTextColor(textId, foreground | 0xff000000);
            Intent launch = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id, views);
        }
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = PendingIntent.getBroadcast(context, 24, new Intent(context, PrayerWidgetProvider.class).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(pending);
        if (at > 0) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, markerIds.length > 0 ? Math.min(at + 1000, System.currentTimeMillis() + 60000) : Math.min(at + 1000, System.currentTimeMillis() + 21600000), pending);
    }
}
