package com.screencare.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

object NotificationHelper {

    fun showEyeBreakNotification(context: Context) {
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_START_BREAK", "eye-break")
        }
        val openPending = PendingIntent.getActivity(
            context,
            101,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val snoozeIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ReminderReceiver.ACTION_SNOOZE
            putExtra("EXTRA_TYPE", "eye-break")
        }
        val snoozePending = PendingIntent.getBroadcast(
            context,
            102,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ScreenCareApp.CHANNEL_EYE_CARE)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("Time to rest your eyes 👁️")
            .setContentText("Look at something in the distance (20 feet) for 20 seconds.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "You have been using your screen actively.\n\n" +
                "1. Look away from screen\n" +
                "2. Focus 20 feet away\n" +
                "3. Blink and relax your eyes"
            ))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setContentIntent(openPending)
            .addAction(0, "Start Break", openPending)
            .addAction(0, "Snooze 5m", snoozePending)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(2020, notification)
    }

    fun showPostureNotification(context: Context) {
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_START_BREAK", "posture-stretch")
        }
        val openPending = PendingIntent.getActivity(
            context,
            201,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ScreenCareApp.CHANNEL_POSTURE)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("Posture & Shoulder Check 🧘")
            .setContentText("Relax your shoulders, align your spine, and sit comfortably.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setContentIntent(openPending)
            .addAction(0, "Start Stretch", openPending)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(2021, notification)
    }
}
