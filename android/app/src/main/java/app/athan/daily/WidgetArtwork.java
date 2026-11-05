package app.athan.daily;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.*;
import android.os.Bundle;

/** Draw the landscape at the launcher's actual size; circles never stretch or crop. */
final class WidgetArtwork {
    static Bitmap render(Context context, AppWidgetManager manager, int id, String prayer, boolean small, int opacity) {
        Bundle options = manager.getAppWidgetOptions(id);
        boolean landscape = context.getResources().getConfiguration().orientation == 2;
        int widthDp = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180);
        int heightDp = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 90);
        int width = Math.max(80, Math.min(1200, widthDp * 3));
        int height = Math.max(80, Math.min(1200, heightDp * 3));
        String start = "#E4EADB", end = "#C9D5B7", hill = "#A7BB95", orb = "#F8F0C9";
        float x = 150f / 180, y = 47f / 90;
        if (prayer.equals("Fajr")) { start="#DCE6F0"; end="#F9DFC9"; hill="#BDC8C4"; orb="#FFF3D5"; x=120f/180; y=75f/90; }
        if (prayer.equals("Dhuhr")) { start="#F7EDC8"; end="#EFDAA0"; hill="#D5C390"; orb="#FFF8D3"; x=137f/180; y=20f/90; }
        if (prayer.equals("Maghrib")) { start="#EBC9BC"; end="#E8A48C"; hill="#BB8585"; orb="#FFDBAD"; x=162f/180; y=76f/90; }
        if (prayer.equals("Isha")) { start="#223350"; end="#34466B"; hill="#1C2B44"; orb="#E6ECF7"; x=140f/180; y=30f/90; }
        Bitmap image = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(image);
        Path outline = new Path(); outline.addRoundRect(0,0,width,height, height*.16f,height*.16f,Path.Direction.CW);
        canvas.clipPath(outline);
        canvas.saveLayerAlpha(0,0,width,height,Math.round(opacity*2.55f));
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        // Equal horizontal and vertical contributions, matching the preview gradient.
        float denominator = 1f/(width*width) + 1f/(height*height);
        paint.setShader(new LinearGradient(0, 0, 2f/width/denominator, 2f/height/denominator, Color.parseColor(start), Color.parseColor(end), Shader.TileMode.CLAMP));
        canvas.drawRect(0,0,width,height,paint);
        paint.setShader(null); paint.setColor(Color.parseColor(orb));
        float radius = small ? Math.min((height / 90f) * 16, width * 0.18f) : (height / 90f) * 16;
        if (prayer.equals("Isha")) {
            radius *= 11f/16;
            if (small) { y=12f/90; radius=Math.min(radius,height/90f*8); }

            NightMoon.draw(context,canvas,paint,x*width,y*height,radius);
            paint.setColor(Color.parseColor("#B4C9ED"));
            for(float[] star : new float[][]{{18,12,.45f,.45f},{45,8,.65f,.7f},{76,15,1f,1f},{108,9,.45f,.45f},{159,10,.65f,.7f},{167,29,.45f,.45f},{24,32,.65f,.7f},{57,27,.45f,.45f},{93,34,.8f,.9f},{115,46,.45f,.45f},{158,51,.8f,.9f},{17,56,.45f,.45f},{46,49,1.05f,1f},{76,60,.45f,.45f},{101,62,.65f,.7f},{169,61,.45f,.45f}}) {
                float sx=star[0]/180*width, sy=star[1]/90*height;
                float starRadius=Math.max(1, height/90f*star[2]);
                if(Math.hypot(sx-x*width,sy-y*height)<radius+starRadius+height/45f) continue;
                paint.setAlpha(Math.round(255*star[3]));
                canvas.drawCircle(sx,sy,starRadius,paint);
            }
        } else canvas.drawCircle(x*width,y*height,radius,paint);
        Path mountains = new Path(); mountains.moveTo(0,78f/90*height);
        for(float[] point : new float[][]{{28,77},{51,81},{89,76},{117,67},{142,72},{180,61},{180,90},{0,90}}) mountains.lineTo(point[0]/180*width,point[1]/90*height);
        mountains.close(); paint.setColor(Color.parseColor(hill)); canvas.drawPath(mountains,paint);
        canvas.restore();
        return image;
    }
}
