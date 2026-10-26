package com.screencare.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

object NotificationHelper {

    fun showEyeBreakNotification(context: Context) {
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
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
            .setContentTitle("Eye break time! (20-20-20 Rule)")
            .setContentText("Look at something approximately 20 feet (6m) away for 20 seconds.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "You have been using your screen actively. Look away into the distance for 20 seconds to relax your accommodating eye muscles."
            ))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
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
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
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
            .setContentTitle("Posture & Shoulder Check")
            .setContentText("Relax your shoulders, align your spine, and sit comfortably.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(openPending)
            .addAction(0, "Start Stretch", openPending)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(2021, notification)
    }
}