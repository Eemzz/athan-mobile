package app.athan.daily;
import android.content.Context;
import android.graphics.*;
import org.json.*;
/** Shared offline illumination samples, generated with the app's SunCalc formulas. */
final class NightMoon {
 static void draw(Context context,Canvas canvas,Paint paint,float cx,float cy,float radius) {
  double fraction=.25; boolean waxing=true;
  try {
   JSONArray samples=new JSONObject(context.getSharedPreferences("athan_widget",0).getString("schedule","{}")).optJSONArray("moons");
   long now=System.currentTimeMillis();
   if(samples!=null) for(int i=0;i<samples.length();i++) {
    JSONObject sample=samples.getJSONObject(i);
    if(sample.getLong("at")>now) break;
    fraction=sample.getDouble("fraction");waxing=sample.getBoolean("waxing");
   }
  } catch(JSONException ignored) { }
  int alpha=paint.getAlpha();
  paint.setAlpha(Math.round(alpha*.12f));canvas.drawCircle(cx,cy,radius*.92f,paint);paint.setAlpha(alpha);
  Path path=new Path();float side=waxing?1:-1;
  for(int j=0;j<2;j++) for(int i=0;i<=64;i++) {
   double angle=j==0?-Math.PI/2+i*Math.PI/64:Math.PI/2-i*Math.PI/64;
   float x=cx+(float)(side*.92*radius*(j==0?1:1-2*fraction)*Math.cos(angle));
   float y=cy+(float)(.92*radius*Math.sin(angle));
   if(j==0&&i==0) path.moveTo(x,y);else path.lineTo(x,y);
  }
  path.close();canvas.drawPath(path,paint);
 }
}
