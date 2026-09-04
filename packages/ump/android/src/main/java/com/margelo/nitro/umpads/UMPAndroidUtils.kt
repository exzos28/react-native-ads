package com.margelo.nitro.umpads

import android.app.Activity
import com.facebook.react.bridge.ReactApplicationContext

internal fun ReactApplicationContext.requireCurrentActivity(): Activity =
  currentActivity ?: error("Cannot request/show UMP consent without an active Activity")
