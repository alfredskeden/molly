package se.skedeback.molly.notify

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.ConnectionPool

/**
 * The connections every `fetch` reuses. `expo/fetch` (and React Native's own networking) keep them in a pool
 * JavaScript can't reach; after an hour in the pocket the network may have silently dropped them, and a
 * request sent on one hangs. Giving every client this pool lets [fresh] throw them away before the next request.
 */
object Connections {
  private val pool = ConnectionPool()

  /** Must run before React starts: `expo/fetch` makes its client once, when its module is created. */
  fun install(context: Context) {
    OkHttpClientProvider.setOkHttpClientFactory {
      // React Native's own client (no timeouts, its cookie jar and cache), sharing this pool.
      OkHttpClientProvider.createClientBuilder(context).connectionPool(pool).build()
    }
  }

  /** Closes the idle connections; the next request opens a new one. A request still running keeps its own. */
  fun fresh() = pool.evictAll()
}
