package com.screencare.app

import android.Manifest
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
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

        // Handle break launch from notification
        handleIncomingBreakIntent(intent)

        // Schedule periodic 20-minute reminders
        ReminderReceiver.scheduleNextReminder(this, 20 * 60 * 1000L, "eye-break")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingBreakIntent(intent)
    }

    private fun handleIncomingBreakIntent(intent: Intent?) {
        val breakType = intent?.getStringExtra("EXTRA_START_BREAK")
        if (breakType != null) {
            showEyeBreakDialog()
        }
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
        var remainingSeconds = 20

        val builder = AlertDialog.Builder(this)
            .setTitle("👁️ 20-20-20 Eye Break (20s)")
            .setMessage("1. Look away from screen\n2. Focus 20 feet (6m) away\n3. Blink and relax your eyes\n\nTime remaining: 20s")
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
                dialog.setMessage("1. Look away from screen\n2. Focus 20 feet (6m) away\n3. Blink and relax your eyes\n\nTime remaining: ${remainingSeconds}s")
            }
            override fun onFinish() {
                dialog.setMessage("✓ Break complete! Your accommodating eye muscles are refreshed.")
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
    }
}
