package app.athan.daily;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
import org.json.*;

/** Playback is independent of the WebView and is released when the reminder is dismissed. */
public class AthanPlaybackService extends Service {
    private static final String ATHAN="athan-playback-v2", DEFAULT="prayer-system-v2";
    private MediaPlayer player;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> { if(change<0) finish(); };
    static Notification notification(Context context,JSONObject prayer,boolean playing) {
        NotificationManager manager=(NotificationManager)context.getSystemService(NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26) {
        NotificationChannel full=new NotificationChannel(ATHAN,"Athan playback",NotificationManager.IMPORTANCE_HIGH);
        full.setSound(null,null); manager.createNotificationChannel(full);
        NotificationChannel normal=new NotificationChannel(DEFAULT,"Prayer reminders",NotificationManager.IMPORTANCE_HIGH);
        normal.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        manager.createNotificationChannel(normal);
        }
        PendingIntent dismiss=PendingIntent.getBroadcast(context,0,new Intent(context,PrayerAlertReceiver.class).setAction(PrayerAlerts.DISMISS),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent open=PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder=new NotificationCompat.Builder(context,playing?ATHAN:DEFAULT)
            .setSmallIcon(R.drawable.ic_stat_athan).setContentTitle("It's "+prayer.optString("name","prayer")+" time")
            .setContentText("")
            .setDefaults(playing ? 0 : Notification.DEFAULT_ALL).setContentIntent(open).setDeleteIntent(dismiss).setAutoCancel(true).setOngoing(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setCategory(NotificationCompat.CATEGORY_REMINDER);

        return builder.build();
    }
    static void remind(Context context,JSONObject prayer) {
        NotificationManager manager=(NotificationManager)context.getSystemService(NOTIFICATION_SERVICE);
        if(manager.areNotificationsEnabled()) manager.notify(PrayerAlerts.NOTIFICATION,notification(context,prayer,false));
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        JSONObject prayer;
        try { prayer=new JSONObject(intent.getStringExtra("prayer")); } catch(Exception e) { stopSelf(); return START_NOT_STICKY; }
        Notification n=notification(this,prayer,true);
        if(Build.VERSION.SDK_INT>=29) startForeground(PrayerAlerts.NOTIFICATION,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(PrayerAlerts.NOTIFICATION,n);
        release();
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        boolean mutedChannel=Build.VERSION.SDK_INT>=26 && manager.getNotificationChannel(ATHAN).getImportance()==NotificationManager.IMPORTANCE_NONE;
        audio=(AudioManager)getSystemService(AUDIO_SERVICE);
        // Honor notification mute, channel settings and Do Not Disturb; never bypass them.
        if(!manager.areNotificationsEnabled() || mutedChannel || audio.getRingerMode()!=AudioManager.RINGER_MODE_NORMAL || manager.getCurrentInterruptionFilter()!=NotificationManager.INTERRUPTION_FILTER_ALL) { finish(); return START_NOT_STICKY; }
        AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        if(Build.VERSION.SDK_INT>=26) {
        focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener(focusListener).build();
        if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { finish(); return START_NOT_STICKY; }
        } else if(audio.requestAudioFocus(focusListener,AudioManager.STREAM_NOTIFICATION,AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { finish(); return START_NOT_STICKY; }
        try {
            player=new MediaPlayer(); player.setAudioAttributes(attributes);
            int resource=getResources().getIdentifier("athan_beautiful","raw",getPackageName());
            android.content.res.AssetFileDescriptor file=getResources().openRawResourceFd(resource);
            player.setDataSource(file.getFileDescriptor(),file.getStartOffset(),file.getLength()); file.close();
            player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
            player.setOnCompletionListener(mp->finish()); player.setOnErrorListener((mp,what,extra)->{finish();return true;});
            player.setOnPreparedListener(mp->mp.start()); player.prepareAsync();
        } catch(Exception e) { finish(); }
        return START_NOT_STICKY;
    }
    private void release() {
        if(player!=null) { player.release(); player=null; }
        if(audio!=null) {
            if(Build.VERSION.SDK_INT>=26 && focus!=null) { audio.abandonAudioFocusRequest(focus); focus=null; }
            else if(Build.VERSION.SDK_INT<26) audio.abandonAudioFocus(focusListener);
        }
    }
    private void finish() { release(); stopForeground(STOP_FOREGROUND_DETACH); stopSelf(); }
    @Override public void onDestroy() { release(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
