package se.skedeback.molly.notify

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

class MollyNotifyPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(
      object : ApplicationLifecycleListener {
        // Before React starts: `expo/fetch` makes its network client as soon as its module is created.
        override fun onCreate(application: Application) = Connections.install(application)
      },
    )
}
