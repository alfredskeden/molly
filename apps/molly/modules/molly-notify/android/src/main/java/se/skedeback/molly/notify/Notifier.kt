package se.skedeback.molly.notify

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.graphics.drawable.IconCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * One ongoing notification per child and running timer (sleep, feeding), ticking with the system chronometer,
 * one Vitamin D reminder per child (`tracker` "reminder") and one nap reminder per child ("napReminder", rung by
 * an alarm at the window's start), both swipeable with no chronometer. The id says the tracker, the tag the child
 * (Baby Buddy's child id), so two sleeping children never share a notification.
 */
object Notifier {
  // Importance can't change once a channel exists: rename the id if it ever has to.
  private const val CHANNEL_ID = "molly.timers"
  private const val REMINDER_CHANNEL_ID = "molly.reminders"
  private const val PREFS = "molly.notify"
  const val WORK_NOTIFICATION_ID = 3
  const val REMINDER = "reminder"
  const val NAP_REMINDER = "napReminder"

  const val ACTION_RUN = "se.skedeback.molly.notify.RUN"
  const val ACTION_DISMISSED = "se.skedeback.molly.notify.DISMISSED"
  /** The reminder's Later button: native only, no JS. */
  const val ACTION_DISMISS = "se.skedeback.molly.notify.DISMISS"
  /** A nap reminder's alarm going off: posts it from what JS last scheduled. */
  const val ACTION_NAP_ALARM = "se.skedeback.molly.notify.NAP_ALARM"
  const val EXTRA_TRACKER = "tracker"
  const val EXTRA_INTENT = "intent"
  const val EXTRA_START = "start"
  const val EXTRA_TITLE = "title"
  const val EXTRA_COLOR = "color"
  const val EXTRA_PENDING = "pending"
  const val EXTRA_CHILD = "child"
  const val EXTRA_AVATAR = "avatar"
  const val EXTRA_AVATAR_COLOR = "avatarColor"
  /** A tap from a notification posted before several children: JS then acts on the widget's child. */
  const val NO_CHILD = -1

  /** Marks a notification drawn by `showPending`, so a worker that fails can tell it's still stuck. */
  private const val EXTRA_IS_PENDING = "se.skedeback.molly.notify.pending"

  /** A colour that can't be parsed (a bug in what JS sent): drawn in this instead of crashing the receiver. */
  private const val FALLBACK_COLOR = 0xFF6B6B6B.toInt()

  /** `Notification.EXTRA_REQUEST_PROMOTED_ONGOING` (API 36). */
  private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

  /** What one notification shows; `start` is epoch ms. `avatar` empty: the tracker icon on `color`. */
  private data class Content(
    val title: String,
    val text: String,
    val start: Long,
    val color: String,
    val actions: List<Action>,
    val avatar: String = "",
    val avatarColor: String = "",
  )

  private data class Action(val intent: String, val label: String, val pending: String)

  private fun Content.toJson(): String = JSONObject()
    .put("title", title)
    .put("text", text)
    .put("start", start)
    .put("color", color)
    .put("avatar", avatar)
    .put("avatarColor", avatarColor)
    .put(
      "actions",
      JSONArray(actions.map { JSONObject().put("intent", it.intent).put("label", it.label).put("pending", it.pending) }),
    )
    .toString()

  private fun contentOf(json: String): Content? = runCatching {
    val o = JSONObject(json)
    val actions = o.getJSONArray("actions")
    Content(
      o.getString("title"),
      o.getString("text"),
      o.getLong("start"),
      o.getString("color"),
      (0 until actions.length()).map { actions.getJSONObject(it) }
        .map { Action(it.getString("intent"), it.getString("label"), it.getString("pending")) },
      o.getString("avatar"),
      o.getString("avatarColor"),
    )
  }.getOrNull()

  /** The last notification JS drew for this tracker and child, buttons and all: what a stuck pending one goes back to. */
  private fun contentKey(tracker: String, child: Int) = "content:$tracker:$child"

  private fun colorOf(hex: String) = runCatching { android.graphics.Color.parseColor(hex) }.getOrDefault(FALLBACK_COLOR)

  private fun idOf(tracker: String) = when (tracker) {
    "sleep" -> 1
    "feeding" -> 2
    REMINDER -> 4
    NAP_REMINDER -> 5
    else -> throw IllegalArgumentException("Unknown tracker $tracker")
  }

  /** The notification's tag: the child it's about. */
  private fun tagOf(child: Int) = child.toString()

  /** The swiped-away state is kept per tracker and child. */
  private fun dismissedKey(tracker: String, child: Int) = "$tracker:$child"

  /** Unique per child, notification and button (`slot` 0–9), so one child's buttons never replace another's. */
  private fun requestCode(child: Int, id: Int, slot: Int) = child * 64 + id * 10 + slot

  /**
   * Posts or updates the child's notification. Skipped when the parent swiped this same timer away (Android 14+
   * lets them): it comes back only for a new timer.
   */
  fun show(context: Context, tracker: String, child: Int, notification: TimerNotification) {
    post(
      context,
      tracker,
      child,
      Content(
        notification.title,
        notification.text,
        notification.start.toLong(),
        notification.color,
        notification.actions.map { Action(it.intent, it.label, it.pending) },
        notification.avatar,
        notification.avatarColor,
      ),
    )
  }

  /**
   * A tapped action, drawn at once from the tap's own extras (the process may just have started, with no JS
   * yet): the pending line and no buttons, so a second tap can't be sent. Same `when`, so the chronometer
   * doesn't jump. JS draws Baby Buddy's answer after the write.
   */
  fun showPending(context: Context, tracker: String, child: Int, tap: Intent) {
    val start = tap.getLongExtra(EXTRA_START, -1)
    val title = tap.getStringExtra(EXTRA_TITLE)
    val pending = tap.getStringExtra(EXTRA_PENDING)
    if (start == -1L || title == null || pending.isNullOrEmpty()) return
    val content = Content(
      title,
      pending,
      start,
      tap.getStringExtra(EXTRA_COLOR) ?: "#000000",
      emptyList(),
      tap.getStringExtra(EXTRA_AVATAR) ?: "",
      tap.getStringExtra(EXTRA_AVATAR_COLOR) ?: "",
    )
    post(context, tracker, child, content, pending = true)
  }

  /**
   * After an action's work ended (done, failed or stopped): a notification still showing its pending line goes
   * back to what JS last drew, buttons included, so it's never stuck without them. Gone when there's nothing to go
   * back to; the next sync draws the truth either way.
   */
  fun restoreIfPending(context: Context, tracker: String, child: Int) {
    val id = runCatching { idOf(tracker) }.getOrNull() ?: return
    val manager = context.getSystemService(NotificationManager::class.java)
    val stuck = manager.activeNotifications.any {
      it.id == id && it.tag == tagOf(child) && it.notification.extras.getBoolean(EXTRA_IS_PENDING)
    }
    if (!stuck) return
    val last = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(contentKey(tracker, child), null)
    val content = last?.let(::contentOf)
    if (content == null) NotificationManagerCompat.from(context).cancel(tagOf(child), id)
    else post(context, tracker, child, content)
  }

  /**
   * Posts or updates the Vitamin D reminder. `key` is the check that posted it: once swiped away or dismissed
   * it stays away until a later check posts a new one.
   */
  fun showReminder(context: Context, child: Int, reminder: ReminderNotification) {
    post(
      context,
      REMINDER,
      child,
      Content(
        reminder.title,
        reminder.text,
        reminder.key.toLong(),
        reminder.color,
        reminder.actions.map { Action(it.intent, it.label, it.pending) },
        reminder.avatar,
        reminder.avatarColor,
      ),
    )
  }

  /** A reminder's Later / Dismiss: gone, and remembered like a swipe so the next sync doesn't bring it back. */
  fun dismissReminder(context: Context, tracker: String, child: Int, key: Long) {
    NotificationManagerCompat.from(context).cancel(tagOf(child), idOf(tracker))
    rememberDismissed(context, tracker, child, key)
  }

  /** What the child's nap reminder posts when its alarm goes off, as JS last scheduled it. */
  private fun napKey(child: Int) = "nap:$child"

  /** The key of the child's nap reminder that already rang, so a reschedule into the past doesn't ring it twice. */
  private fun napRungKey(child: Int) = "napRung:$child"

  /** The alarms' request slots: two per child (on time, and through Doze), replaced on every schedule. */
  private const val NAP_ALARM_SLOT = 7
  private const val NAP_IDLE_ALARM_SLOT = 6

  /** How late the on-time alarm may ring: the shortest window Android 12+ keeps without the exact-alarm permission. */
  private const val NAP_ALARM_WINDOW_MS = 10 * 60_000L

  private fun napAlarm(context: Context, child: Int, slot: Int = NAP_ALARM_SLOT) =
    broadcast(context, requestCode(child, idOf(NAP_REMINDER), slot), ACTION_NAP_ALARM) {
      putExtra(EXTRA_TRACKER, NAP_REMINDER)
      putExtra(EXTRA_CHILD, child)
    }

  /**
   * Sets (or moves) the child's nap reminder alarms to `at`, with no exact-alarm permission: one within 10 minutes
   * after it (`setWindow`, held back in Doze), and one that rings in Doze too (`setAndAllowWhileIdle`, which Android
   * may hold back by most of the time until `at`). Whichever rings first posts it; the other finds it rang. At a
   * time already past, it rings at once, unless this same reminder (`key`) has rung already.
   */
  fun scheduleNapReminder(context: Context, child: Int, reminder: NapReminderNotification) {
    val content = Content(
      reminder.title,
      reminder.text,
      reminder.key.toLong(),
      reminder.color,
      reminder.actions.map { Action(it.intent, it.label, it.pending) },
      reminder.avatar,
      reminder.avatarColor,
    )
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.edit().putString(napKey(child), content.toJson()).apply()
    if (prefs.getLong(napRungKey(child), -1) == content.start) return
    val alarms = context.getSystemService(AlarmManager::class.java)
    val at = reminder.at.toLong()
    alarms.setWindow(AlarmManager.RTC_WAKEUP, at, NAP_ALARM_WINDOW_MS, napAlarm(context, child))
    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, napAlarm(context, child, NAP_IDLE_ALARM_SLOT))
  }

  /** The alarm went off: posts the reminder JS last scheduled, and remembers it rang. */
  fun ringNapReminder(context: Context, child: Int) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val content = prefs.getString(napKey(child), null)?.let(::contentOf) ?: return
    if (prefs.getLong(napRungKey(child), -1) == content.start) return
    prefs.edit().putLong(napRungKey(child), content.start).apply()
    post(context, NAP_REMINDER, child, content)
  }

  /** Cancels the nap reminders (alarm and notification) of every child not in `children`. */
  fun keepOnlyNapReminders(context: Context, children: List<Int>) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val alarms = context.getSystemService(AlarmManager::class.java)
    val scheduled = prefs.all.keys.filter { it.startsWith("nap:") }.mapNotNull { it.removePrefix("nap:").toIntOrNull() }
    for (child in scheduled.filter { it !in children }) {
      alarms.cancel(napAlarm(context, child))
      alarms.cancel(napAlarm(context, child, NAP_IDLE_ALARM_SLOT))
      prefs.edit().remove(napKey(child)).remove(napRungKey(child)).apply()
    }
    keepOnly(context, NAP_REMINDER, children)
  }

  private fun post(context: Context, tracker: String, child: Int, content: Content, pending: Boolean = false) {
    val start = content.start
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val key = dismissedKey(tracker, child)
    val dismissed = prefs.getLong(key, -1)
    if (dismissed == start) return
    if (dismissed != -1L) prefs.edit().remove(key).apply()

    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannels(context)
    val id = idOf(tracker)
    val reminder = tracker == REMINDER || tracker == NAP_REMINDER
    val builder = if (reminder) reminderBuilder(context, content) else timerBuilder(context, content)
    // A nap reminder's `when` is when it was set, not worth showing: its text says the window.
    if (tracker == NAP_REMINDER) builder.setShowWhen(false)
    // Several children: the child's initial on its colour replaces the tracker icon, so whose it is shows first.
    if (content.avatar.isNotEmpty() && content.avatarColor.isNotEmpty()) {
      builder
        .setSmallIcon(IconCompat.createWithBitmap(initialIcon(content.avatar)))
        .setColor(colorOf(content.avatarColor))
    } else {
      builder
        .setSmallIcon(R.drawable.molly_notify_icon)
        .setColor(colorOf(content.color))
    }
    builder
      .setContentTitle(content.title)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(launchApp(context))
      .setDeleteIntent(
        broadcast(context, requestCode(child, id, 9), ACTION_DISMISSED) {
          putExtra(EXTRA_TRACKER, tracker)
          putExtra(EXTRA_CHILD, child)
          putExtra(EXTRA_START, start)
        },
      )
    if (pending) builder.addExtras(Bundle().apply { putBoolean(EXTRA_IS_PENDING, true) })
    // An empty text is no text line, not a blank one.
    if (content.text.isNotEmpty()) builder.setContentText(content.text)
    content.actions.forEachIndexed { index, action ->
      builder.addAction(
        0,
        action.label,
        broadcast(context, requestCode(child, id, index), ACTION_RUN) {
          putExtra(EXTRA_TRACKER, tracker)
          putExtra(EXTRA_CHILD, child)
          putExtra(EXTRA_INTENT, action.intent)
          putExtra(EXTRA_PENDING, action.pending)
          putExtra(EXTRA_TITLE, content.title)
          putExtra(EXTRA_START, start)
          putExtra(EXTRA_COLOR, content.color)
          putExtra(EXTRA_AVATAR, content.avatar)
          putExtra(EXTRA_AVATAR_COLOR, content.avatarColor)
        },
      )
    }
    if (reminder && content.actions.isNotEmpty()) {
      builder.addAction(
        0,
        if (tracker == NAP_REMINDER) "Dismiss" else "Later",
        broadcast(context, requestCode(child, id, 8), ACTION_DISMISS) {
          putExtra(EXTRA_TRACKER, tracker)
          putExtra(EXTRA_CHILD, child)
          putExtra(EXTRA_START, start)
        },
      )
    }
    if (!pending) prefs.edit().putString(contentKey(tracker, child), content.toJson()).apply()
    try {
      manager.notify(tagOf(child), id, builder.build())
    } catch (_: SecurityException) {
      // The permission was revoked between the check and the post; nothing to show.
    }
  }

  private fun timerBuilder(context: Context, content: Content) = NotificationCompat.Builder(context, CHANNEL_ID)
    // Updating with the same `when` keeps the chronometer counting from the timer's start.
    .setWhen(content.start)
    // Newest timer first: sort keys order ascending, so a later start gets a smaller key.
    .setSortKey((Long.MAX_VALUE - content.start).toString().padStart(19, '0'))
    .setShowWhen(true)
    .setUsesChronometer(true)
    .setOngoing(true)
    .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
    // Asks Android 16+ for a Live Update (lock-screen card, status-bar chip ticking the chronometer), in
    // every state so the card never drops back to plain mid-timer. androidx.core 1.13 has no
    // setRequestPromotedOngoing, so the extra is set directly; older Android ignores it.
    .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })

  // Not ongoing and not promoted: a reminder the parent may swipe away. `when` is the check that posted it (Vitamin D)
  // or when it was set (nap).
  private fun reminderBuilder(context: Context, content: Content) = NotificationCompat.Builder(context, REMINDER_CHANNEL_ID)
    .setWhen(content.start)
    .setShowWhen(true)
    .setCategory(NotificationCompat.CATEGORY_REMINDER)

  /**
   * A child's initial as a small icon. Android draws small icons as a mask (every visible pixel in the
   * notification's colour, or white on it), so this is the letter alone, opaque on transparent.
   */
  private fun initialIcon(initial: String): Bitmap {
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = android.graphics.Color.WHITE
      textSize = size * 0.78f
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textAlign = Paint.Align.CENTER
    }
    // Centred on the letter's own box, not the baseline.
    val bounds = android.graphics.Rect()
    paint.getTextBounds(initial, 0, initial.length, bounds)
    Canvas(bitmap).drawText(initial, size / 2f, size / 2f - bounds.exactCenterY(), paint)
    return bitmap
  }

  /**
   * Cancels the tracker's notifications of every child not in `children`: stopped, hidden, or signed out. Also
   * the untagged ones posted before several children, and their swiped-away state, so a new timer shows again.
   */
  fun keepOnly(context: Context, tracker: String, children: List<Int>) {
    val id = idOf(tracker)
    val keep = children.map(::tagOf).toSet()
    val manager = context.getSystemService(NotificationManager::class.java)
    for (shown in manager.activeNotifications) {
      if (shown.id == id && shown.tag !in keep) NotificationManagerCompat.from(context).cancel(shown.tag, id)
    }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val kept = children.flatMap { listOf(dismissedKey(tracker, it), contentKey(tracker, it)) }.toSet()
    val stale = prefs.all.keys.filter {
      (it == tracker || it.startsWith("$tracker:") || it.startsWith("content:$tracker:")) && it !in kept
    }
    if (stale.isNotEmpty()) prefs.edit().apply { stale.forEach(::remove) }.apply()
  }

  fun rememberDismissed(context: Context, tracker: String, child: Int, start: Long) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong(dismissedKey(tracker, child), start).apply()
  }

  /** Shown only where Android needs a foreground notification for the action's work (API < 31). */
  fun working(context: Context): Notification {
    ensureChannels(context)
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.molly_notify_icon)
      .setContentTitle("Saving…")
      .setSilent(true)
      .build()
  }

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    ensureChannel(context, CHANNEL_ID, "Running timers", "A running sleep or feeding, with its timer and stop buttons")
    ensureChannel(
      context,
      REMINDER_CHANNEL_ID,
      "Reminders",
      "Vitamin D not given today, and the nap reminders set on this phone",
    )
  }

  private fun ensureChannel(context: Context, id: String, name: String, description: String) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(id) != null) return
    // DEFAULT, not LOW: Pixel hides "silent" (LOW) notifications on the lock screen. No sound or vibration.
    val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_DEFAULT).apply {
      this.description = description
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun launchApp(context: Context): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun broadcast(context: Context, requestCode: Int, action: String, extras: Intent.() -> Unit): PendingIntent {
    val intent = Intent(context, ActionReceiver::class.java).setAction(action).apply(extras)
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }
}
