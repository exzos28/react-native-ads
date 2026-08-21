package com.margelo.nitro.levelplayads

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.CountDownLatch

internal fun ReactApplicationContext.requireCurrentActivity(): Activity =
  currentActivity ?: error("Cannot show LevelPlay ad without an active Activity")

internal fun levelPlayAdsException(stage: String, errorCode: String, message: String) =
  IllegalStateException("LevelPlay $stage failed ($errorCode): $message")

/** Mirrors HybridLevelPlayAds.swift's `runOnMain` so consent metadata writes happen on the same thread on both platforms. */
internal fun runOnMain(body: () -> Unit) {
  if (Looper.myLooper() == Looper.getMainLooper()) {
    body()
    return
  }
  val latch = CountDownLatch(1)
  Handler(Looper.getMainLooper()).post {
    try {
      body()
    } finally {
      latch.countDown()
    }
  }
  latch.await()
}
