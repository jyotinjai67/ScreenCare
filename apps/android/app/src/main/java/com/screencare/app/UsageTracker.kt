package com.screencare.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import java.util.Calendar

data class UsageResult(
    val totalMinutes: Long,
    val isExactMeasured: Boolean,
    val description: String
)

object UsageTracker {

    fun hasUsagePermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun getTodayUsage(context: Context): UsageResult {
        if (!hasUsagePermission(context)) {
            // Local fallback session tracking
            val prefs = context.getSharedPreferences("screencare_local", Context.MODE_PRIVATE)
            val fallbackMins = prefs.getLong("fallback_screen_mins", 45L)
            return UsageResult(
                totalMinutes = fallbackMins,
                isExactMeasured = false,
                description = "Estimated via active session timer. Enable Usage Access for system-wide stats."
            )
        }

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return UsageResult(45L, false, "UsageStatsManager unavailable")

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )

        var totalMillis = 0L
        if (!stats.isNullOrEmpty()) {
            for (stat in stats) {
                totalMillis += stat.totalTimeInForeground
            }
        }

        val minutes = totalMillis / (1000 * 60)
        return UsageResult(
            totalMinutes = minutes,
            isExactMeasured = true,
            description = "Accurately measured today via Android UsageStatsManager."
        )
    }
}