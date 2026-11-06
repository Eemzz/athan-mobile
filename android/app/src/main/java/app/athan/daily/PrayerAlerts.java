package app.athan.daily;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;

/** Device-scheduled prayer reminders; no server or internet connection is required. */
final class PrayerAlerts {
    static final String PREFS = "athan_alerts";
    static final int NOTIFICATION = 7301;
    static final String FIRE = "app.athan.daily.PRAYER_ALERT";
    static final String DISMISS = "app.athan.daily.DISMISS_ATHAN";
    static PendingIntent alarm(Context context, int index) {
        return PendingIntent.getBroadcast(context, 20000 + index, new Intent(context, PrayerAlertReceiver.class).setAction(FIRE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context context, String json) throws JSONException {
        JSONObject schedule = new JSONObject(json);
        schedule.getJSONArray("prayers");
        context.getSharedPreferences(PREFS,0).edit().putString("schedule",json).apply();
        if (schedule.getJSONArray("prayers").length()==0 || !schedule.optBoolean("sound",true)) {
            context.stopService(new Intent(context,AthanPlaybackService.class));
            ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NOTIFICATION);
        }
        restore(context);
    }
    static PendingIntent refresh(Context context) {
        return PendingIntent.getBroadcast(context,19999,new Intent(context,PrayerAlertReceiver.class).setAction("app.athan.daily.REFRESH_ALERTS"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void restore(Context context) {
        AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        for(int i=0;i<60;i++) alarms.cancel(alarm(context,i));
        alarms.cancel(refresh(context));
        try {
            JSONObject data=new JSONObject(context.getSharedPreferences(PREFS,0).getString("schedule","{}"));
            JSONObject calculation=data.optJSONObject("calculation");
            if(calculation!=null) {
                data.put("prayers",PrayerSchedule.calculate(calculation,System.currentTimeMillis()));
                context.getSharedPreferences(PREFS,0).edit().putString("schedule",data.toString()).apply();
                // Daily maintenance plus a refill after every prayer keeps the window rolling.
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,System.currentTimeMillis()+86400000L,refresh(context));
            }
            JSONArray prayers=data.optJSONArray("prayers");
            if(prayers==null) return;
            for(int i=0;i<Math.min(60,prayers.length());i++) {
                long at=prayers.getJSONObject(i).getLong("at");
                if(at<=System.currentTimeMillis()) continue;
                if(Build.VERSION.SDK_INT<31 || alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,alarm(context,i));
                else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,alarm(context,i));
            }
        } catch(JSONException ignored) { }
    }
    static JSONObject due(Context context) {
        try {
            JSONObject data=new JSONObject(context.getSharedPreferences(PREFS,0).getString("schedule","{}"));
            JSONArray rows=data.getJSONArray("prayers");
            long now=System.currentTimeMillis();
            for(int i=rows.length()-1;i>=0;i--) {
                JSONObject row=rows.getJSONObject(i);
                long at=row.getLong("at");
                if(at<=now && now-at<15*60*1000L) {
                    long last=context.getSharedPreferences(PREFS,0).getLong("last",0);
                    if(last>=at) return null;
                    context.getSharedPreferences(PREFS,0).edit().putLong("last",at).apply();
                    return new JSONObject().put("name",row.getString("name")).put("location",data.optString("location")).put("sound",data.optBoolean("sound",true));
                }
            }
        } catch(JSONException ignored) { }
        return null;
    }
}
