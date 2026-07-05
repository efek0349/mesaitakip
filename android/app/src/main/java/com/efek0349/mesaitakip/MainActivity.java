package com.efek0349.mesaitakip;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.efek0349.mesaitakip.plugins.SafBackupPlugin;
import com.efek0349.mesaitakip.plugins.WidgetUpdatePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafBackupPlugin.class);
        registerPlugin(WidgetUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
