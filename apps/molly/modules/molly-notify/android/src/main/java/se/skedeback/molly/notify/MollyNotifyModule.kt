package se.skedeback.molly.notify

import android.app.NotificationManager
import android.app.UiModeManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class NotificationAction : Record {
  @Field val intent: String = ""
  @Field val label: String = ""
  /** What the notification says once this action is tapped, until JS draws the answer. */
  @Field val pending: String = ""
}

/** What `src/notification/model.ts` builds; `start` is epoch ms, `color` a hex accent. */
class TimerNotification : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val start: Double = 0.0
  @Field val color: String = "#000000"
  @Field val actions: List<NotificationAction> = emptyList()
  /** The child's initial, drawn as the icon on `avatarColor` while several children are shown; empty for none. */
  @Field val avatar: String = ""
  @Field val avatarColor: String = ""
}

/** The Vitamin D reminder; `key` is epoch ms of the check that posted it, `text` empty for no text line. */
class ReminderNotification : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val key: Double = 0.0
  @Field val color: String = "#000000"
  @Field val actions: List<NotificationAction> = emptyList()
  @Field val avatar: String = ""
  @Field val avatarColor: String = ""
}

/** A nap reminder, rung at `at` (epoch ms); `key` is when it was set, epoch ms. */
class NapReminderNotification : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val key: Double = 0.0
  @Field val at: Double = 0.0
  @Field val color: String = "#000000"
  @Field val actions: List<NotificationAction> = emptyList()
  @Field val avatar: String = ""
  @Field val avatarColor: String = ""
}

class MollyNotifyModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  private fun appSettings(action: String) = Intent(action)
    .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

  // The posting calls are async: system calls, SharedPreferences and a bitmap, kept off the JS thread. JS awaits
  // them one after another, since their order matters.
  override fun definition() = ModuleDefinition {
    Name("MollyNotify")

    /** Drops the connections kept from before the app or a headless task last ran; see `Connections`. */
    Function("freshConnections") { Connections.fresh() }

    /** One child's timer notification; notifications are told apart by child (tag) and tracker (id). */
    AsyncFunction("show") { tracker: String, child: Int, notification: TimerNotification ->
      Notifier.show(context, tracker, child, notification)
    }

    /** Cancels this tracker's notifications of every child not listed, and untagged ones from before children. */
    AsyncFunction("keepOnly") { tracker: String, children: List<Int> ->
      Notifier.keepOnly(context, tracker, children)
    }

    AsyncFunction("showReminder") { child: Int, reminder: ReminderNotification ->
      Notifier.showReminder(context, child, reminder)
    }

    AsyncFunction("keepOnlyReminders") { children: List<Int> ->
      Notifier.keepOnly(context, Notifier.REMINDER, children)
    }

    /** Sets or moves the child's nap reminder alarm; it posts on `molly.reminders` when it goes off. */
    AsyncFunction("scheduleNapReminder") { child: Int, reminder: NapReminderNotification ->
      Notifier.scheduleNapReminder(context, child, reminder)
    }

    /** Cancels the nap reminder alarm and notification of every child not listed. */
    AsyncFunction("keepOnlyNapReminders") { children: List<Int> ->
      Notifier.keepOnlyNapReminders(context, children)
    }

    /** False when the permission is denied or the parent blocked Molly's notifications in Android settings. */
    Function("allowed") {
      NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    /**
     * Tells Android the app's own Day / Night choice, which it keeps across restarts, so the system splash
     * (drawn before any JavaScript runs) already uses the right theme. Android 12+ only.
     */
    Function("setNightMode") { preference: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function
      val mode = when (preference) {
        "night" -> UiModeManager.MODE_NIGHT_YES
        "day" -> UiModeManager.MODE_NIGHT_NO
        else -> UiModeManager.MODE_NIGHT_AUTO
      }
      (context.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager).setApplicationNightMode(mode)
    }

    /** Molly's own notification settings, for once Android no longer shows the permission prompt. */
    Function("openSettings") {
      context.startActivity(appSettings(Settings.ACTION_APP_NOTIFICATION_SETTINGS))
    }

    /** Whether Android may promote Molly's notifications to Live Updates: `unsupported` before Android 16. */
    AsyncFunction("liveUpdates") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.BAKLAVA) return@AsyncFunction "unsupported"
      val manager = context.getSystemService(NotificationManager::class.java)
      if (manager.canPostPromotedNotifications()) "on" else "off"
    }

    /** Android's Live Updates switch for Molly, or its notification settings where that screen is missing. */
    Function("openLiveUpdateSettings") {
      try {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.BAKLAVA) throw ActivityNotFoundException()
        context.startActivity(appSettings(Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS))
      } catch (_: ActivityNotFoundException) {
        context.startActivity(appSettings(Settings.ACTION_APP_NOTIFICATION_SETTINGS))
      }
    }
  }
}
