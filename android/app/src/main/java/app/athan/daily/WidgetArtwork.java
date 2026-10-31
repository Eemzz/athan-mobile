package app.athan.daily;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.*;
import android.os.Bundle;

/** Draw the landscape at the launcher's actual size; circles never stretch or crop. */
final class WidgetArtwork {
    static Bitmap render(Context context, AppWidgetManager manager, int id, String prayer) {
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
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        // Equal horizontal and vertical contributions, matching the preview gradient.
        float denominator = 1f/(width*width) + 1f/(height*height);
        paint.setShader(new LinearGradient(0, 0, 2f/width/denominator, 2f/height/denominator, Color.parseColor(start), Color.parseColor(end), Shader.TileMode.CLAMP));
        canvas.drawRect(0,0,width,height,paint);
        paint.setShader(null); paint.setColor(Color.parseColor(orb));
        float radius = Math.min(width / 180f, height / 90f) * 16;
        if (prayer.equals("Isha")) {
            radius *= 11f/16;
            Path moon = new Path(); moon.addCircle(x*width,y*height,radius,Path.Direction.CW);
            Path cutout = new Path(); cutout.addCircle(x*width+radius*.7f,y*height-radius*.4f,radius*.95f,Path.Direction.CW);
            moon.op(cutout,Path.Op.DIFFERENCE); canvas.drawPath(moon,paint);
            paint.setColor(Color.parseColor("#B4C9ED"));
            for(float[] star : new float[][]{{108,17},{163,12},{121,38},{169,44}}) canvas.drawCircle(star[0]/180*width,star[1]/90*height,Math.max(1, height/180f),paint);
        } else canvas.drawCircle(x*width,y*height,radius,paint);
        Path mountains = new Path(); mountains.moveTo(0,78f/90*height);
        for(float[] point : new float[][]{{28,77},{51,81},{89,76},{117,67},{142,72},{180,61},{180,90},{0,90}}) mountains.lineTo(point[0]/180*width,point[1]/90*height);
        mountains.close(); paint.setColor(Color.parseColor(hill)); canvas.drawPath(mountains,paint);
        return image;
    }
}