package com.screencare.app

import android.Manifest
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.provider.Settings
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var tvScore: TextView
    private lateinit var tvScreenTime: TextView
    private lateinit var pbScreenTime: ProgressBar
    private lateinit var tvUsageNotice: TextView
    private lateinit var tvEyeCountdown: TextView
    private lateinit var btnTakeEyeBreak: Button
    private lateinit var btnCameraCheck: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvScore = findViewById(R.id.tvScore)
        tvScreenTime = findViewById(R.id.tvScreenTime)
        pbScreenTime = findViewById(R.id.pbScreenTime)
        tvUsageNotice = findViewById(R.id.tvUsageNotice)
        tvEyeCountdown = findViewById(R.id.tvEyeCountdown)
        btnTakeEyeBreak = findViewById(R.id.btnTakeEyeBreak)
        btnCameraCheck = findViewById(R.id.btnCameraCheck)

        requestNecessaryPermissions()
        refreshMetrics()

        btnTakeEyeBreak.setOnClickListener {
            showEyeBreakDialog()
        }

        btnCameraCheck.setOnClickListener {
            startActivity(Intent(this, DistanceEstimatorActivity::class.java))
        }

        // Schedule periodic 20-minute reminders
        ReminderReceiver.scheduleNextReminder(this, 20 * 60 * 1000L, "eye-break")
    }

    override fun onResume() {
        super.onResume()
        refreshMetrics()
    }

    private fun refreshMetrics() {
        val usage = UsageTracker.getTodayUsage(this)
        val hours = usage.totalMinutes / 60
        val mins = usage.totalMinutes % 60
        tvScreenTime.text = "${hours}h ${mins}m"
        tvUsageNotice.text = usage.description

        // Calculate score
        val score = if (usage.totalMinutes <= 360) 88 else 68
        tvScore.text = "$score"

        val pct = Math.min(100, ((usage.totalMinutes.toFloat() / 360f) * 100).toInt())
        pbScreenTime.progress = pct
    }

    private fun showEyeBreakDialog() {
        val dialogView = layoutInflater.inflate(R.layout.activity_distance, null)
        var remainingSeconds = 20

        val builder = AlertDialog.Builder(this)
            .setTitle("👁️ 20-20-20 Eye Break (20s)")
            .setMessage("Look at an object at least 20 feet (6m) away. Inhale gently and blink softly.\n\nTime remaining: 20s")
            .setPositiveButton("Complete Break") { dialog, _ ->
                Toast.makeText(this, "✓ Eye break recorded! Your vision thanks you.", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNeutralButton("Snooze 5m") { dialog, _ ->
                ReminderReceiver.scheduleNextReminder(this, 5 * 60 * 1000L, "eye-break")
                Toast.makeText(this, "Snoozed for 5 minutes.", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("Dismiss", null)

        val dialog = builder.create()
        dialog.show()

        val timer = object : CountDownTimer(20000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                remainingSeconds = (millisUntilFinished / 1000).toInt()
                dialog.setMessage("Look at an object at least 20 feet (6m) away. Inhale gently and blink softly.\n\nTime remaining: ${remainingSeconds}s")
            }
            override fun onFinish() {
                dialog.setMessage("Break complete! Great job maintaining healthy screen habits.")
            }
        }
        timer.start()

        dialog.setOnDismissListener {
            timer.cancel()
        }
    }

    private fun requestNecessaryPermissions() {
        // Notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 201)
            }
        }

        // Onboarding check for Usage Stats
        if (!UsageTracker.hasUsagePermission(this)) {
            val prefs = getSharedPreferences("screencare_prefs", Context.MODE_PRIVATE)
            val asked = prefs.getBoolean("asked_usage", false)
            if (!asked) {
                prefs.edit().putBoolean("asked_usage", true).apply()
                AlertDialog.Builder(this)
                    .setTitle("Optional: Screen Time Insights")
                    .setMessage("To automatically estimate your daily screen usage without collecting any personal data or app names, ScreenCare can read device screen time stats.\n\nWould you like to enable this?")
                    .setPositiveButton("Enable in Settings") { _, _ ->
                        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                    }
                    .setNegativeButton("Keep Offline Estimation", null)
                    .show()
            }
        }
    }
}