package com.screencare.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = context.getSharedPreferences("screencare_prefs", Context.MODE_PRIVATE)

        when (intent.action) {
            ACTION_TRIGGER_REMINDER -> {
                val type = intent.getStringExtra("EXTRA_TYPE") ?: "eye-break"
                val now = System.currentTimeMillis()
                val lastNotified = prefs.getLong("last_notified_$type", 0L)

                // Atomic deduplication: Ensure minimum 45s gap between identical reminders
                if (now - lastNotified >= 45_000L) {
                    prefs.edit().putLong("last_notified_$type", now).apply()

                    if (type == "eye-break") {
                        NotificationHelper.showEyeBreakNotification(context)
                    } else {
                        NotificationHelper.showPostureNotification(context)
                    }
                }

                // Schedule next cycle independently for this reminder type
                val defaultMins = if (type == "eye-break") 20 else 45
                val intervalMins = prefs.getInt("interval_$type", defaultMins)
                scheduleNextReminder(context, intervalMins * 60 * 1000L, type)
            }
            ACTION_SNOOZE -> {
                val type = intent.getStringExtra("EXTRA_TYPE") ?: "eye-break"
                // Snooze 5 minutes
                scheduleNextReminder(context, 5 * 60 * 1000L, type)
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule reminders independently upon device boot
                val eyeMins = prefs.getInt("interval_eye-break", 20)
                val postureMins = prefs.getInt("interval_posture-stretch", 45)
                scheduleNextReminder(context, eyeMins * 60 * 1000L, "eye-break")
                scheduleNextReminder(context, postureMins * 60 * 1000L, "posture-stretch")
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
            val requestCode = when (type) {
                "eye-break" -> 1001
                "posture-stretch" -> 1002
                "stand-move" -> 1003
                "walking" -> 1004
                else -> 1005
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
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
