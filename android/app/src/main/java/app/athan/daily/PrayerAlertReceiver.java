package app.athan.daily;

import android.content.*;
import org.json.JSONObject;

public class PrayerAlertReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent) {
        if(PrayerAlerts.DISMISS.equals(intent.getAction())) {
            context.stopService(new Intent(context,AthanPlaybackService.class));
            ((android.app.NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(PrayerAlerts.NOTIFICATION);
        } else if(PrayerAlerts.FIRE.equals(intent.getAction())) {
            JSONObject due=PrayerAlerts.due(context);
            PrayerAlerts.restore(context);
            if(due==null) return;
            if(!due.optBoolean("sound")) { AthanPlaybackService.remind(context,due); return; }
            try { androidx.core.content.ContextCompat.startForegroundService(context,new Intent(context,AthanPlaybackService.class).putExtra("prayer",due.toString())); }
            catch(RuntimeException blocked) { AthanPlaybackService.remind(context,due); }
        } else PrayerAlerts.restore(context);
    }
}
