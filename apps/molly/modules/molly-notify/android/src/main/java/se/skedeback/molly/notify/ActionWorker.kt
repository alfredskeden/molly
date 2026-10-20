package se.skedeback.molly.notify

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.work.ForegroundInfo
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import com.google.common.util.concurrent.ListenableFuture
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Runs the headless JS task "MollyNotifyAction" with the tapped intent and its notification's child, starting React if the process was
 * killed. A Kotlin port of react-native-android-widget's `oss/HeadlessJsTaskWorker` (MIT), the same
 * mechanism the widget's taps use.
 */
class ActionWorker(context: Context, params: WorkerParameters) :
  ListenableWorker(context, params),
  HeadlessJsTaskEventListener {
  private var taskId = -1
  private var completer: CallbackToFutureAdapter.Completer<Result>? = null
  /** The task is started once, whichever of the two ways to see React ready gets there first. */
  private val started = AtomicBoolean(false)
  private val finished = AtomicBoolean(false)
  private val timeout = Handler(Looper.getMainLooper())

  override fun startWork(): ListenableFuture<Result> = CallbackToFutureAdapter.getFuture { completer ->
    this.completer = completer
    val intent = inputData.getString(Notifier.EXTRA_INTENT)
    if (intent == null) {
      finish(Result.failure())
    } else {
      // React that never starts, or a task that never reports back, must not keep the notification pending.
      timeout.postDelayed({ finish(Result.failure()) }, WORK_TIMEOUT_MS)
      val data = Arguments.createMap().apply {
        putString("intent", intent)
        putInt("child", inputData.getInt(Notifier.EXTRA_CHILD, Notifier.NO_CHILD))
      }
      startTask(HeadlessJsTaskConfig(TASK, data, TIMEOUT_MS, true))
    }
    TASK
  }

  // Expedited work on API < 31 runs as a foreground service, which needs a notification.
  override fun getForegroundInfoAsync(): ListenableFuture<ForegroundInfo> = CallbackToFutureAdapter.getFuture {
    it.set(ForegroundInfo(Notifier.WORK_NOTIFICATION_ID, Notifier.working(applicationContext)))
    "foregroundInfo"
  }

  private fun startTask(config: HeadlessJsTaskConfig) {
    val host = (applicationContext as ReactApplication).reactHost
    if (host == null) {
      finish(Result.failure())
      return
    }
    host.currentReactContext?.let { return invokeStartTask(it, config) }
    val listener = object : ReactInstanceEventListener {
      override fun onReactContextInitialized(context: ReactContext) {
        host.removeReactInstanceEventListener(this)
        invokeStartTask(context, config)
      }
    }
    host.addReactInstanceEventListener(listener)
    // React may have finished starting between the first check and the listener: then it never calls it.
    val ready = host.currentReactContext
    if (ready != null) {
      host.removeReactInstanceEventListener(listener)
      invokeStartTask(ready, config)
    } else {
      host.start()
    }
  }

  private fun invokeStartTask(context: ReactContext, config: HeadlessJsTaskConfig) {
    if (!started.compareAndSet(false, true)) return
    val tasks = HeadlessJsTaskContext.getInstance(context)
    tasks.addTaskEventListener(this)
    UiThreadUtil.runOnUiThread { taskId = tasks.startTask(config) }
  }

  override fun onHeadlessJsTaskStart(taskId: Int) {}

  override fun onHeadlessJsTaskFinish(taskId: Int) {
    if (taskId != this.taskId) return
    finish(Result.success())
  }

  override fun onStopped() {
    super.onStopped()
    finish(Result.failure())
  }

  /** Once, however the work ends: a notification JS never redrew gets its buttons back. */
  private fun finish(result: Result) {
    if (!finished.compareAndSet(false, true)) return
    timeout.removeCallbacksAndMessages(null)
    val tracker = inputData.getString(Notifier.EXTRA_TRACKER)
    if (tracker != null) {
      runCatching { Notifier.restoreIfPending(applicationContext, tracker, inputData.getInt(Notifier.EXTRA_CHILD, Notifier.NO_CHILD)) }
    }
    completer?.set(result)
    cleanUp()
  }

  private fun cleanUp() {
    val context = (applicationContext as ReactApplication).reactHost?.currentReactContext ?: return
    HeadlessJsTaskContext.getInstance(context).removeTaskEventListener(this)
  }

  companion object {
    const val TASK = "MollyNotifyAction"
    private const val TIMEOUT_MS = 30_000L
    /** The JS task's own timeout, plus time for React to start. */
    private const val WORK_TIMEOUT_MS = TIMEOUT_MS + 30_000L
  }
}
