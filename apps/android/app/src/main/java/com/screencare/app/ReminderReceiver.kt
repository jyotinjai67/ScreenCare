package com.screencare.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_TRIGGER_REMINDER -> {
                val type = intent.getStringExtra("EXTRA_TYPE") ?: "eye-break"
                if (type == "eye-break") {
                    NotificationHelper.showEyeBreakNotification(context)
                } else {
                    NotificationHelper.showPostureNotification(context)
                }
                // Schedule next 20-minute reminder
                scheduleNextReminder(context, 20 * 60 * 1000L, "eye-break")
            }
            ACTION_SNOOZE -> {
                // Snooze 5 minutes
                scheduleNextReminder(context, 5 * 60 * 1000L, "eye-break")
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule reminders upon device boot
                scheduleNextReminder(context, 20 * 60 * 1000L, "eye-break")
            }
        }
    }

    companion object {
        const val ACTION_TRIGGER_REMINDER = "com.screencare.app.ACTION_TRIGGER_REMINDER"
        const val ACTION_SNOOZE = "com.screencare.app.ACTION_SNOOZE"

        fun scheduleNextReminder(context: Context, delayMillis: Long, type: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ReminderReceiver::class.java).apply {
                action = ACTION_TRIGGER_REMINDER
                putExtra("EXTRA_TYPE", type)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                1001,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerTime = System.currentTimeMillis() + delayMillis
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
            }
        }
    }
}