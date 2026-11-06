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
        Paint backgroundPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        backgroundPaint.setColor((background & 0xffffff) | (alpha << 24));
        canvas.drawRoundRect(0,0,widthDp,heightDp,18,18,backgroundPaint);
        String font=appearance.optString("fontFamily","serif").equals("sans-serif") ? "sans-serif" : "serif";
        float padding=Math.min(12,widthDp*.065f), left=padding, right=widthDp-padding;
        float contentHeight=heightDp-padding*2;
        float unit=Math.min(contentHeight/68f,(right-left)/160f);
        float top=(heightDp-68*unit)/2;
        text(canvas,paint,"NEXT ATHAN",left,top+8*unit,8*unit,ink,false,"sans-serif");
        String clock=at>0 ? clock(at,zone) : "Set location";
        float clockSize=16*unit;
        paint.setTextSize(clockSize); paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));
        float clockWidth=paint.measureText(clock);
        float nameWidth=Math.max(25,right-left-clockWidth-12*unit);
        paint.setTypeface(Typeface.create(font,Typeface.NORMAL)); paint.setTextSize(30*unit);
        float nameSize=32*unit*Math.min(1,nameWidth/Math.max(1,paint.measureText(name)));
        text(canvas,paint,name,left,top+35*unit,nameSize,ink,false,font);
        text(canvas,paint,clock,right-clockWidth,top+29*unit,clockSize,ink,false,"sans-serif");
        String remaining=at>0 ? remaining(at-now) : "Open app";
        if(at>0 && !day(at,zone).equals(day(now,zone))) remaining+=" · Tomorrow";
        paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL)); paint.setTextSize(10*unit); float remainingWidth=paint.measureText(remaining);
        text(canvas,paint,remaining,right-remainingWidth,top+40*unit,10*unit,ink,false,"sans-serif");
        paint.setColor(ink);paint.setAlpha(153);canvas.drawCircle(right-remainingWidth-6.5f*unit,top+36.5f*unit,2.5f*unit,paint);paint.setAlpha(255);
        float railY=top+51*unit;
        paint.setStrokeWidth(Math.max(1,unit)); paint.setColor(ink); paint.setAlpha(45); canvas.drawLine(left,railY,right,railY,paint);
        float progress=previousAt>0 && at>previousAt ? Math.max(0,Math.min(1,(float)(now-previousAt)/(at-previousAt))) : 0;
        paint.setAlpha(255); canvas.drawLine(left,railY,left+(right-left)*progress,railY,paint);
        canvas.drawCircle(left+(right-left)*progress,railY,2.5f*unit,paint);
        String before=previousAt>0 ? previousName+" · "+clock(previousAt,zone) : "Next athan";
        String after=at>0 ? name+" · "+clock : "";
        float captionSize=9*unit;
        paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL)); paint.setTextSize(captionSize);
        captionSize*=Math.min(1,(right-left-8*unit)/Math.max(1,paint.measureText(before)+paint.measureText(after)));
        paint.setTextSize(captionSize); float afterWidth=paint.measureText(after);
        text(canvas,paint,before,left,top+65*unit,captionSize,ink,false,"sans-serif");
        text(canvas,paint,after,right-afterWidth,top+65*unit,captionSize,ink,false,font);
        RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.time_marker_widget);
        views.setImageViewBitmap(R.id.marker_art,image);
        views.setContentDescription(R.id.marker_art,"Next athan: "+name+", "+clock+", "+remaining);
        return views;
    }
    private static int color(String value,int fallback) { try { return Color.parseColor(value); } catch (IllegalArgumentException e) { return fallback; } }
    private static String day(long at,String zone) { SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone(zone));return f.format(new Date(at)); }
    private static String clock(long at,String zone) { SimpleDateFormat f=new SimpleDateFormat("h:mm a",Locale.getDefault());f.setTimeZone(TimeZone.getTimeZone(zone));return f.format(new Date(at)); }
    private static void text(Canvas c,Paint p,String value,float x,float y,float size,int ink,boolean bold,String font) { p.setStyle(Paint.Style.FILL);p.setColor(ink);p.setAlpha(255);p.setTypeface(Typeface.create(font,bold?Typeface.BOLD:Typeface.NORMAL));p.setTextSize(size);c.drawText(value,x,y,p); }
    static String remaining(long milliseconds) {
        long minutes=Math.max(1,(long)Math.ceil(milliseconds/60000d));
        return "In "+(minutes>=60 ? minutes/60+"h " : "")+minutes%60+"m";
    }
}
