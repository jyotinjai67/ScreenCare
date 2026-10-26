package com.screencare.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class ScreenCareApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val eyeChannel = NotificationChannel(
                CHANNEL_EYE_CARE,
                "20-20-20 Eye Breaks",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Periodic reminders to look 20 feet away for 20 seconds"
                enableVibration(true)
            }

            val postureChannel = NotificationChannel(
                CHANNEL_POSTURE,
                "Posture & Movement Breaks",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Reminders to sit tall, stretch shoulders, and stand up"
            }

            val generalChannel = NotificationChannel(
                CHANNEL_GENERAL,
                "Screen Health Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General screen fatigue and ergonomic guidance"
            }

            notificationManager.createNotificationChannels(listOf(eyeChannel, postureChannel, generalChannel))
        }
    }

    companion object {
        const val CHANNEL_EYE_CARE = "eye_care_breaks"
        const val CHANNEL_POSTURE = "posture_alerts"
        const val CHANNEL_GENERAL = "screen_health_reminders"
    }
}