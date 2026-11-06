package app.athan.daily;
import android.content.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PrayerRefreshTest {
 @Test public void calculationsMatchAppAcrossMethodsMadhabsAndDst() throws Exception {
  Context test=InstrumentationRegistry.getInstrumentation().getContext();
  java.io.InputStream input=test.getAssets().open("prayer-parity.json");
  java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[4096];int length;
  while((length=input.read(buffer))!=-1) bytes.write(buffer,0,length);input.close();
  JSONArray fixtures=new JSONArray(bytes.toString("UTF-8"));
  for(int i=0;i<fixtures.length();i++) {
   JSONObject fixture=fixtures.getJSONObject(i);JSONArray actual=PrayerSchedule.calculate(fixture.getJSONObject("config"),fixture.getLong("now"));
   JSONArray expected=fixture.getJSONArray("prayers");
   for(int j=0;j<5;j++) {
    assertEquals(expected.getJSONObject(j).getString("name"),actual.getJSONObject(j).getString("name"));
    assertEquals("Fixture "+i+" prayer "+j,expected.getJSONObject(j).getLong("at"),actual.getJSONObject(j).getLong("at"));
   }
  }
 }
 @Test public void expiredScheduleRefillsAndMutedPrayersStayDisabled() throws Exception {
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  SharedPreferences prefs=context.getSharedPreferences(PrayerAlerts.PREFS,0);String original=prefs.getString("schedule","{\"prayers\":[]}");
  try {
   JSONObject config=new JSONObject("{\"latitude\":34.0522,\"longitude\":-118.2437,\"timezone\":\"America/Los_Angeles\",\"method\":\"NorthAmerica\",\"muted\":[\"Asr\"]}");
   PrayerAlerts.schedule(context,new JSONObject().put("calculation",config).put("prayers",new JSONArray()).toString());
   JSONArray rows=new JSONObject(prefs.getString("schedule","{}")).getJSONArray("prayers");
   assertTrue(rows.length()>40);
   assertTrue(rows.getJSONObject(rows.length()-1).getLong("at")>System.currentTimeMillis()+12*86400000L);
   for(int i=0;i<rows.length();i++) assertNotEquals("Asr",rows.getJSONObject(i).getString("name"));
   PrayerAlerts.schedule(context,"{\"prayers\":[]}");PrayerAlerts.restore(context);
   assertEquals(0,new JSONObject(prefs.getString("schedule","{}")).getJSONArray("prayers").length());
  } finally { PrayerAlerts.schedule(context,original); }
 }
}
