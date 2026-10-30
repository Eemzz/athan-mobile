package app.athan.daily;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrayerWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
