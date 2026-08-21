package com.margelo.nitro.pangleads

import com.facebook.react.bridge.ReactApplicationContext

// PAGInterstitialAdInteractionListener/PAGRewardedAdInteractionListener have no
// show-failure callback, so a show() that the SDK silently drops would
// otherwise never emit CLOSED/ERROR and hang the caller forever. show() call
// sites arm a timeout via this value and clear it once a real callback fires.
internal const val PANGLE_SHOW_TIMEOUT_MS = 10_000L

internal class PangleLoadException(
  val code: Int,
  message: String,
) : IllegalStateException(message)

internal fun pangleException(stage: String, code: Int, message: String) =
  PangleLoadException(code, "Pangle $stage failed ($code): $message")

internal fun pangleShowTimeoutPayload(): PangleAdEventPayload =
  PangleAdEventPayload(
    errorCode = null,
    errorMessage = "Pangle ad show() timed out without a response from the SDK",
  )

internal fun ReactApplicationContext.requireCurrentActivity() =
  currentActivity ?: error("Cannot show Pangle ad without an active Activity")

internal fun Throwable.toPangleEventPayload(): PangleAdEventPayload =
  PangleAdEventPayload(
    errorCode = (this as? PangleLoadException)?.code?.toDouble(),
    errorMessage = message ?: localizedMessage,
  )
