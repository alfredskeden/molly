package se.skedeback.molly.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Data
import androidx.work.OneTimeWorkRequest
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager

/**
 * Notification taps, and the nap reminder's alarm. Actions run as expedited work rather than a headless service: Android 12+ forbids
 * starting a foreground service from the background, and this works with the app process killed.
 */
class ActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val tracker = intent.getStringExtra(Notifier.EXTRA_TRACKER) ?: return
    // Whose notification it is: the tap acts on that child, whatever the app or widget shows.
    val child = intent.getIntExtra(Notifier.EXTRA_CHILD, Notifier.NO_CHILD)
    when (intent.action) {
      Notifier.ACTION_DISMISSED ->
        Notifier.rememberDismissed(context, tracker, child, intent.getLongExtra(Notifier.EXTRA_START, -1))
      Notifier.ACTION_DISMISS -> Notifier.dismissReminder(context, tracker, child, intent.getLongExtra(Notifier.EXTRA_START, -1))
      Notifier.ACTION_NAP_ALARM -> Notifier.ringNapReminder(context, child)
      Notifier.ACTION_RUN -> {
        val action = intent.getStringExtra(Notifier.EXTRA_INTENT) ?: return
        Notifier.showPending(context, tracker, child, intent)
        val request = OneTimeWorkRequest.Builder(ActionWorker::class.java)
          .setInputData(
            Data.Builder()
              .putString(Notifier.EXTRA_INTENT, action)
              .putString(Notifier.EXTRA_TRACKER, tracker)
              .putInt(Notifier.EXTRA_CHILD, child)
              .build(),
          )
          .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
          .build()
        WorkManager.getInstance(context).enqueue(request)
      }
    }
  }
}
