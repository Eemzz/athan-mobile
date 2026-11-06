package app.athan.daily;

import com.batoulapps.adhan.*;
import com.batoulapps.adhan.data.DateComponents;
import java.util.*;
import org.json.*;

/** Recalculates a rolling window offline using the saved prayer preferences. */
final class PrayerSchedule {
 static JSONArray calculate(JSONObject config,long now) throws JSONException {
  CalculationMethod method;
  switch(config.getString("method")) {
   case "MuslimWorldLeague": method=CalculationMethod.MUSLIM_WORLD_LEAGUE;break;
   case "UmmAlQura": method=CalculationMethod.UMM_AL_QURA;break;
   case "Egyptian": method=CalculationMethod.EGYPTIAN;break;
   case "Karachi": method=CalculationMethod.KARACHI;break;
   default: method=CalculationMethod.NORTH_AMERICA;
  }
  CalculationParameters params=method.getParameters();
  params.madhab=config.optBoolean("hanafi")?Madhab.HANAFI:Madhab.SHAFI;
  Coordinates coordinates=new Coordinates(config.getDouble("latitude"),config.getDouble("longitude"));
  Calendar day=Calendar.getInstance(TimeZone.getTimeZone(config.getString("timezone")));
  day.setTimeInMillis(now); day.set(Calendar.HOUR_OF_DAY,12);
  Set<String> muted=new HashSet<>();JSONArray disabled=config.optJSONArray("muted");
  if(disabled!=null) for(int i=0;i<disabled.length();i++) muted.add(disabled.getString(i));
  JSONArray rows=new JSONArray();String[] names={"Fajr","Dhuhr","Asr","Maghrib","Isha"};
  for(int i=0;i<14;i++,day.add(Calendar.DATE,1)) {
   PrayerTimes times=new PrayerTimes(coordinates,new DateComponents(day.get(Calendar.YEAR),day.get(Calendar.MONTH)+1,day.get(Calendar.DAY_OF_MONTH)),params);
   Date[] dates={times.fajr,times.dhuhr,times.asr,times.maghrib,times.isha};
   for(int j=0;j<5;j++) if(!muted.contains(names[j])&&dates[j]!=null&&dates[j].getTime()>now-900000)
    rows.put(new JSONObject().put("name",names[j]).put("at",dates[j].getTime()/60000L*60000L));
  }
  return rows;
 }
}
