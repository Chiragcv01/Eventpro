package com.sabmanage.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;

/**
 * SabManage: team alerts from sabmanage.com (title starts with the bell or siren emoji)
 * are posted on our own "Team alerts" channel; other notifications use the normal channel. That channel plays the SabManage tune on the
 * ALARM sound stream, so it is heard even when the phone is on silent / vibrate.
 * Urgent alerts (siren emoji) repeat the tune until the notification is opened.
 */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    static final String CHANNEL = "sabmanage_team_alerts";
    static final long[] VIBRATE = {0, 700, 250, 700, 250, 1000};

    @Override
    public void onCreate() {
        super.onCreate();
    }

    private Uri tune() {
        return Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.sabmanage_alert);
    }

    private AudioAttributes alarmAudio() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
    }

    private NotificationChannel ensureChannel(NotificationManager nm) {
        NotificationChannel ch = nm.getNotificationChannel(CHANNEL);
        if (ch == null) {
            ch = new NotificationChannel(CHANNEL, "Team alerts", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alerts from your owner or team. Rings with the SabManage tune, even on silent.");
            ch.setSound(tune(), alarmAudio());
            ch.enableVibration(true);
            ch.setVibrationPattern(VIBRATE);
            ch.enableLights(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        return ch;
    }

    @Override
    public boolean onAreNotificationsEnabled(String channelName) {
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            NotificationChannel ch = nm.getNotificationChannel(CHANNEL);
            return ch == null || ch.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    @Override
    public boolean onNotifyNotificationWithChannel(String platformTag, int platformId,
                                                   Notification notification, String channelName) {
        try {
            if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return false;
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            CharSequence title = notification.extras != null ? notification.extras.getCharSequence(Notification.EXTRA_TITLE) : null;
            String t = title == null ? "" : title.toString();
            boolean urgent = t.startsWith("\uD83D\uDEA8");
            boolean ring = urgent || t.startsWith("\uD83D\uDD14");
            // morning summary, "work done" updates etc. use the normal notification sound
            if (!ring) return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
            Notification.Builder b = Notification.Builder.recoverBuilder(this, notification)
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setVisibility(Notification.VISIBILITY_PUBLIC);
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = ensureChannel(nm);
                if (ch.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
                b.setChannelId(CHANNEL);
            } else {
                b.setSound(tune(), alarmAudio()).setVibrate(VIBRATE).setPriority(Notification.PRIORITY_MAX);
            }
            Notification out = b.build();
            if (urgent) out.flags |= Notification.FLAG_INSISTENT;
            nm.notify(platformTag, platformId, out);
            return true;
        } catch (RuntimeException e) {
            return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
        }
    }
}
