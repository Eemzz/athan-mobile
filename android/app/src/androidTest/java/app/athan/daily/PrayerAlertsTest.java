package app.athan.daily;

import android.app.*;
import android.content.*;
import android.media.AudioManager;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PrayerAlertsTest {
    private Context context;
    private NotificationManager notifications;
    private String original;
    private long last;
    @Before public void prepare() {
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        notifications=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        original=context.getSharedPreferences(PrayerAlerts.PREFS,0).getString("schedule","{\"prayers\":[]}");
        last=context.getSharedPreferences(PrayerAlerts.PREFS,0).getLong("last",0);
        InstrumentationRegistry.getInstrumentation().startActivitySync(new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        SystemClock.sleep(2000);
    }
    @After public void restore() throws Exception {
        PrayerAlerts.schedule(context,original);
        context.getSharedPreferences(PrayerAlerts.PREFS,0).edit().putLong("last",last).commit();
    }
    private boolean playing() {
        ActivityManager manager=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
        for(ActivityManager.RunningServiceInfo service:manager.getRunningServices(100)) if(service.service.getClassName().equals(AthanPlaybackService.class.getName())) return true;
        return false;
    }
    @Test public void dismissingAthanNotificationStopsPlaybackService() throws Exception {
        assertTrue("Enable emulator notifications for this test",notifications.areNotificationsEnabled());
        ((AudioManager)context.getSystemService(Context.AUDIO_SERVICE)).setRingerMode(AudioManager.RINGER_MODE_NORMAL);
        JSONObject prayer=new JSONObject().put("name","Asr").put("location","Notification test").put("sound",true);
        context.startForegroundService(new Intent(context,AthanPlaybackService.class).putExtra("prayer",prayer.toString()));
        Notification alert=null;
        for(int i=0;i<40;i++) {
            for(android.service.notification.StatusBarNotification item:notifications.getActiveNotifications()) if(item.getId()==PrayerAlerts.NOTIFICATION) alert=item.getNotification();
            if(alert!=null && playing()) break;
            SystemClock.sleep(100);
        }
        assertNotNull("Athan notification must be visible",alert);
        assertTrue("Playback service must run",playing());
        assertNull("Playback channel must not play a second notification sound",notifications.getNotificationChannel(alert.getChannelId()).getSound());
        assertTrue("No Stop athan action should appear",alert.actions==null || alert.actions.length==0);
        assertNotNull("Notification needs a swipe-dismiss handler",alert.deleteIntent);
        alert.deleteIntent.send();
        for(int i=0;i<40 && playing();i++) SystemClock.sleep(100);
        assertFalse("Dismissing must stop the service and release audio",playing());
    }
    @Test public void soundDisabledUsesSystemNotificationChannelWithoutPlayback() throws Exception {
        context.stopService(new Intent(context,AthanPlaybackService.class));
        JSONObject prayer=new JSONObject().put("name","Isha").put("location","Notification test").put("sound",false);
        AthanPlaybackService.remind(context,prayer);
        NotificationChannel channel=notifications.getNotificationChannel("prayer-system-v2");
        assertNotNull(channel);
        assertEquals(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,channel.getSound());
        assertFalse(playing());
    }
}
