package com.margelo.nitro.pangleads

import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.bytedance.sdk.openadsdk.api.reward.PAGRewardItem
import com.bytedance.sdk.openadsdk.api.reward.PAGRewardedAd
import com.bytedance.sdk.openadsdk.api.reward.PAGRewardedAdInteractionListener
import com.bytedance.sdk.openadsdk.api.reward.PAGRewardedAdLoadListener
import com.bytedance.sdk.openadsdk.api.reward.PAGRewardedRequest
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridPangleRewardedAd(
  private val context: ReactApplicationContext,
  private val placementId: String,
) : HybridPangleRewardedAdSpec(), PAGRewardedAdInteractionListener {
  private val events = PangleAdEventEmitter()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var ad: PAGRewardedAd? = null
  private var showTimeout: Runnable? = null

  override fun load(verification: PangleAdVerificationOptions?) {
    context.runOnUiQueueThread {
      val request = buildRewardedRequest(verification)
      PAGRewardedAd.loadAd(
        placementId,
        request,
        object : PAGRewardedAdLoadListener {
          override fun onError(code: Int, message: String) {
            mainHandler.post {
              events.emit(
                PangleAdEventType.ERROR,
                pangleException("load", code, message).toPangleEventPayload(),
              )
            }
          }

          override fun onAdLoaded(rewardedAd: PAGRewardedAd) {
            mainHandler.post {
              rewardedAd.setAdInteractionListener(this@HybridPangleRewardedAd)
              ad = rewardedAd
              events.emit(PangleAdEventType.REWARDED_LOADED)
            }
          }
        },
      )
    }
  }

  private fun buildRewardedRequest(verification: PangleAdVerificationOptions?): PAGRewardedRequest {
    val request = PAGRewardedRequest()
    val extraInfo = extraInfoFrom(verification)
    if (extraInfo.isNotEmpty()) {
      request.extraInfo = extraInfo
    }
    return request
  }

  // Pangle SDK 8.2.0.4 only reads the `media_extra` key from
  // PAGRewardedRequest.extraInfo (confirmed with Pangle support); any other
  // key, including a literal `userId`/`customData`, is silently ignored and
  // the S2S callback's `user_id` stays "defaultUser". PAGConfig.setUserData()
  // has no effect on the SSV callback either. Only `userId` is forwarded —
  // Pangle has room for a single opaque value, so `customData` (a distinct,
  // unrelated field) is not supported here.
  private fun extraInfoFrom(verification: PangleAdVerificationOptions?): Map<String, String> = buildMap {
    verification?.userId?.takeIf { it.isNotEmpty() }?.let { put("media_extra", it) }
  }

  override fun show(): Promise<Unit> = Promise.async {
    withContext(Dispatchers.Main) {
      val activity = context.requireCurrentActivity()
      val current = ad ?: error("Pangle rewarded ad is not ready")
      armShowTimeout()
      current.show(activity)
    }
  }

  override fun addAdEventListener(
    eventType: PangleAdEventType,
    listener: (payload: PangleAdEventPayload?) -> Unit,
  ) = events.add(eventType, listener)

  override fun removeAdEventListener(subscriptionId: Double) {
    events.remove(subscriptionId)
  }

  override fun removeAllListeners() {
    events.removeAll()
  }

  override fun onAdShowed() {
    disarmShowTimeout()
    events.emit(PangleAdEventType.OPENED)
  }

  override fun onAdClicked() {
    events.emit(PangleAdEventType.CLICKED)
  }

  override fun onAdDismissed() {
    disarmShowTimeout()
    ad = null
    events.emit(PangleAdEventType.CLOSED)
  }

  override fun onUserEarnedReward(rewardItem: PAGRewardItem) {
    disarmShowTimeout()
    events.emit(PangleAdEventType.REWARDED_EARNED_REWARD)
  }

  override fun onUserEarnedRewardFail(errorCode: Int, errorMsg: String) {
    events.emit(
      PangleAdEventType.ERROR,
      pangleException("reward", errorCode, errorMsg).toPangleEventPayload(),
    )
  }

  private fun armShowTimeout() {
    disarmShowTimeout()
    val runnable = Runnable {
      showTimeout = null
      ad = null
      events.emit(PangleAdEventType.ERROR, pangleShowTimeoutPayload())
    }
    showTimeout = runnable
    mainHandler.postDelayed(runnable, PANGLE_SHOW_TIMEOUT_MS)
  }

  private fun disarmShowTimeout() {
    showTimeout?.let(mainHandler::removeCallbacks)
    showTimeout = null
  }
}
