package com.margelo.nitro.unityads

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.CountDownLatch

internal fun ReactApplicationContext.requireCurrentActivity(): Activity =
  currentActivity ?: error("Cannot show Unity ad without an active Activity")

internal fun unityAdsException(stage: String, errorName: String, message: String) =
  IllegalStateException("Unity Ads $stage failed ($errorName): $message")

/** Mirrors HybridUnityAds.swift's `runOnMain` so consent MetaData writes happen on the same thread on both platforms. */
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
