package com.margelo.nitro.liftoffads

import android.app.Activity
import android.view.View
import com.facebook.react.bridge.ReactApplicationContext
import com.vungle.ads.VungleError
import java.lang.ref.WeakReference

internal fun ReactApplicationContext.requireCurrentActivity(): Activity =
  currentActivity ?: error("Cannot show Liftoff ad without an active Activity")

internal class ImmersiveModeController {
  private var activityReference: WeakReference<Activity>? = null
  private var previousSystemUiVisibility: Int? = null

  fun enable(activity: Activity) {
    restore()

    @Suppress("DEPRECATION")
    val decorView = activity.window.decorView
    @Suppress("DEPRECATION")
    previousSystemUiVisibility = decorView.systemUiVisibility
    activityReference = WeakReference(activity)

    @Suppress("DEPRECATION")
    decorView.systemUiVisibility =
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
        View.SYSTEM_UI_FLAG_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
  }

  fun restore() {
    val activity = activityReference?.get()
    val visibility = previousSystemUiVisibility
    activityReference = null
    previousSystemUiVisibility = null

    if (activity != null && visibility != null) {
      activity.runOnUiThread {
        @Suppress("DEPRECATION")
        activity.window.decorView.systemUiVisibility = visibility
      }
    }
  }
}

internal fun liftoffException(stage: String, error: VungleError) =
  IllegalStateException(
    "Liftoff $stage failed (${error.code}): ${error.localizedMessage}",
    error,
  )
