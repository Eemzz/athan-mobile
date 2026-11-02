package app.athan.daily;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.*;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

final class MarkerWidgetRenderer {
    static RemoteViews views(Context context, AppWidgetManager manager, int id) {
        Bundle options = manager.getAppWidgetOptions(id);
        boolean landscape = context.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        int widthDp = Math.max(80, options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180));
        int heightDp = Math.max(40, options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 80));
        float scale = Math.min(3f, 1000f / Math.max(widthDp, heightDp));
        Bitmap image = Bitmap.createBitmap(Math.round(widthDp * scale), Math.round(heightDp * scale), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(image);
        canvas.scale(scale, scale);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        JSONObject data = new JSONObject(), appearance = new JSONObject();
        JSONArray prayers = new JSONArray();
        String name = "Open Athan", previousName = "", zone = "UTC";
        long at = 0, previousAt = 0, now = System.currentTimeMillis();
        try {
            data = new JSONObject(context.getSharedPreferences("athan_widget",0).getString("schedule","{}"));
            appearance = data.optJSONObject("marker"); if (appearance == null) appearance = new JSONObject();
            prayers = data.optJSONArray("prayers"); if (prayers == null) prayers = new JSONArray();
            zone = data.optString("timezone","UTC");
            for (int i=0; i<prayers.length(); i++) {
                JSONObject prayer=prayers.getJSONObject(i);
                if (prayer.getLong("at") > now) { name=prayer.getString("name"); at=prayer.getLong("at"); break; }
                previousName=prayer.getString("name"); previousAt=prayer.getLong("at");
            }
        } catch (JSONException ignored) { }
        boolean dark=(context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;
        String mode=appearance.optString("textMode","automatic");
        int ink=color(mode.equals("custom") ? appearance.optString("textColor","#516a58") : mode.equals("light") || (mode.equals("automatic") && dark) ? "#f4f5f7" : "#263239", Color.DKGRAY);
        int background=color(appearance.optString("backgroundColor","#ffffff"),Color.WHITE);
        int alpha=(int)Math.round(255*(1-Math.max(0,Math.min(100,appearance.optDouble("transparency",100)))/100));
        paint.setColor((background & 0xffffff) | (alpha << 24));
        canvas.drawRoundRect(0,0,widthDp,heightDp,18,18,paint);
        float padding=Math.min(12,widthDp*.06f), left=padding, right=widthDp-padding;
        float contentHeight=heightDp-padding*2;
        float unit=Math.min(1f, contentHeight/68f);
        float top=(heightDp-68*unit)/2;
        text(canvas,paint,"NEXT PRAYER",left,top+8*unit,8*unit,ink,false);
        String clock=at>0 ? clock(at,zone) : "Set location";
        float clockSize=13*unit;
        paint.setTextSize(clockSize); paint.setTypeface(Typeface.DEFAULT);
        float clockWidth=paint.measureText(clock);
        float nameWidth=Math.max(25,right-left-clockWidth-26*unit);
        paint.setTypeface(Typeface.create("serif",Typeface.BOLD)); paint.setTextSize(28*unit);
        float nameSize=28*unit*Math.min(1,nameWidth/Math.max(1,paint.measureText(name)));
        text(canvas,paint,name,left,top+35*unit,nameSize,ink,true);
        float iconX=left+paint.measureText(name)+5*unit;
        icon(canvas,paint,name,iconX,top+22*unit,13*unit,ink);
        text(canvas,paint,clock,right-clockWidth,top+29*unit,clockSize,ink,false);
        String remaining=at>0 ? "in "+Math.max(1,(long)Math.ceil((at-now)/60000d))+" min" : "Open app";
        paint.setTextSize(8*unit); float remainingWidth=paint.measureText(remaining);
        text(canvas,paint,remaining,right-remainingWidth,top+40*unit,8*unit,ink,false);
        float railY=top+51*unit;
        paint.setStrokeWidth(Math.max(1,unit)); paint.setColor(ink); paint.setAlpha(45); canvas.drawLine(left,railY,right,railY,paint);
        float progress=previousAt>0 && at>previousAt ? Math.max(0,Math.min(1,(float)(now-previousAt)/(at-previousAt))) : 0;
        paint.setAlpha(255); canvas.drawLine(left,railY,left+(right-left)*progress,railY,paint);
        canvas.drawCircle(left+(right-left)*progress,railY,2.5f*unit,paint);
        String before=previousAt>0 ? previousName+" · "+clock(previousAt,zone) : "Next prayer";
        String after=at>0 ? name+" · "+clock : "";
        float captionSize=7*unit;
        paint.setTextSize(captionSize); float afterWidth=paint.measureText(after);
        text(canvas,paint,before,left,top+65*unit,captionSize,ink,false);
        text(canvas,paint,after,right-afterWidth,top+65*unit,captionSize,ink,false);
        RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.time_marker_widget);
        views.setImageViewBitmap(R.id.marker_art,image);
        views.setContentDescription(R.id.marker_art,"Next prayer: "+name+", "+clock+", "+remaining);
        return views;
    }
    private static int color(String value,int fallback) { try { return Color.parseColor(value); } catch (IllegalArgumentException e) { return fallback; } }
    private static String clock(long at,String zone) { SimpleDateFormat f=new SimpleDateFormat("h:mm a",Locale.getDefault());f.setTimeZone(TimeZone.getTimeZone(zone));return f.format(new Date(at)); }
    private static void text(Canvas c,Paint p,String value,float x,float y,float size,int ink,boolean serif) { p.setStyle(Paint.Style.FILL);p.setColor(ink);p.setTypeface(Typeface.create(serif?"serif":"sans-serif",serif?Typeface.BOLD:Typeface.NORMAL));p.setTextSize(size);c.drawText(value,x,y,p); }
    private static void icon(Canvas c,Paint p,String prayer,float x,float y,float size,int ink) {
        c.save();c.translate(x,y);c.scale(size/24,size/24);p.setColor(ink);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.6f);p.setStrokeCap(Paint.Cap.ROUND);
        if (prayer.equals("Isha")) { Path moon=new Path();moon.moveTo(20,15);moon.cubicTo(9,20,4,9,12,3);moon.cubicTo(0,1,0,22,13,22);moon.quadTo(19,22,20,15);c.drawPath(moon,p); }
        else if (prayer.equals("Fajr") || prayer.equals("Maghrib")) { c.drawArc(6,10,18,22,180,180,false,p);c.drawLine(2,21,22,21,p);c.drawLine(12,2,12,8,p);float tip=prayer.equals("Fajr")?2:8,tail=prayer.equals("Fajr")?5:5;c.drawLine(9,tail,12,tip,p);c.drawLine(15,tail,12,tip,p);c.drawLine(2,13,4,14,p);c.drawLine(20,14,22,13,p); }
        else { c.drawCircle(12,12,4,p);for(int i=0;i<8;i++){double a=i*Math.PI/4;c.drawLine(12+(float)Math.cos(a)*8,12+(float)Math.sin(a)*8,12+(float)Math.cos(a)*10,12+(float)Math.sin(a)*10,p);} }
        p.setStyle(Paint.Style.FILL);c.restore();
    }
}
