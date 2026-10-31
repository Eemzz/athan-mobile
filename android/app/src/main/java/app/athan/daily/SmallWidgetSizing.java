package app.athan.daily;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Paint;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.RemoteViews;

/** Fit the small widget to launcher dimensions, including the user's font scale. */
final class SmallWidgetSizing {
    static void apply(Context context, AppWidgetManager manager, int id, RemoteViews views, String prayer, String clock) {
        Bundle options = manager.getAppWidgetOptions(id);
        boolean landscape = context.getResources().getConfiguration().orientation == 2;
        float width = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 70);
        float height = options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 80);
        float density = context.getResources().getDisplayMetrics().density;
        float scaledDensity = context.getResources().getDisplayMetrics().scaledDensity;
        int inset = width < 70 ? 6 : 8;
        float available = Math.max(20, width - inset * 2);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        float labelSize = fit(paint, "NEXT PRAYER", 8, available * density, scaledDensity, false);
        float nameSize = fit(paint, prayer, 24, available * density, scaledDensity, true);
        float timeSize = fit(paint, clock, 12, available * density, scaledDensity, false);
        float blockHeight = height(paint,labelSize,scaledDensity) + height(paint,nameSize,scaledDensity) + height(paint,timeSize,scaledDensity);
        float factor = Math.min(1, Math.max(20, height - 8) * density / blockHeight);
        views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, labelSize * factor);
        views.setTextViewTextSize(R.id.widget_prayer, TypedValue.COMPLEX_UNIT_SP, nameSize * factor);
        views.setTextViewTextSize(R.id.widget_time, TypedValue.COMPLEX_UNIT_SP, timeSize * factor);
        views.setViewPadding(R.id.widget_content, Math.round(inset*density), Math.round(4*density), Math.round(inset*density), Math.round(4*density));
    }
    private static float fit(Paint paint, String text, float maximum, float width, float scaledDensity, boolean serif) {
        paint.setTypeface(android.graphics.Typeface.create(serif ? "serif" : "sans-serif", android.graphics.Typeface.NORMAL));
        paint.setTextSize(maximum * scaledDensity);
        return maximum * Math.min(1, width / Math.max(1, paint.measureText(text)));
    }
    private static float height(Paint paint, float sp, float scaledDensity) {
        paint.setTextSize(sp * scaledDensity);
        Paint.FontMetrics metrics = paint.getFontMetrics();
        return metrics.descent - metrics.ascent;
    }
}