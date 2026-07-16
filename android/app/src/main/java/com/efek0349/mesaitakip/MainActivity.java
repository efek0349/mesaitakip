package com.efek0349.mesaitakip;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.efek0349.mesaitakip.plugins.SafBackupPlugin;
import com.efek0349.mesaitakip.plugins.WidgetUpdatePlugin;
import com.efek0349.mesaitakip.plugins.SalaryReminderPlugin;
import com.efek0349.mesaitakip.plugins.WorkEndReminderPlugin;
import com.efek0349.mesaitakip.plugins.ReminderExclusionsPlugin;
import com.efek0349.mesaitakip.plugins.AutoBackupSchedulerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafBackupPlugin.class);
        registerPlugin(WidgetUpdatePlugin.class);
        registerPlugin(SalaryReminderPlugin.class);
        registerPlugin(WorkEndReminderPlugin.class);
        registerPlugin(ReminderExclusionsPlugin.class);
        registerPlugin(AutoBackupSchedulerPlugin.class);
        super.onCreate(savedInstanceState);

        // Ana ekrandaki "Mesai Ekle" widget'ı, "Ekle" işleminden sonra kısa bir
        // bilgilendirme bildirimi gösteriyor (bkz. MesaiWidgetProvider.kt).
        // Android 13 (API 33) ve üzerinde bildirim göstermek için çalışma
        // zamanı izni gerekiyor — uygulama ilk açıldığında bu izni istiyoruz.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }
    }
}
