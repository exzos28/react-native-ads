package com.margelo.nitro.pangleads

import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.bytedance.sdk.openadsdk.api.init.PAGConfig
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
      // Pangle's S2S reward callback fills `user_id` from this SDK-wide
      // setting, not from PAGRewardedRequest.extraInfo — without it Pangle
      // reports the callback with its own placeholder user id.
      verification?.userId?.takeIf { it.isNotEmpty() }?.let(PAGConfig::setUserData)
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

  private fun extraInfoFrom(verification: PangleAdVerificationOptions?): Map<String, String> = buildMap {
    verification?.userId?.takeIf { it.isNotEmpty() }?.let { put("userId", it) }
    verification?.customData?.takeIf { it.isNotEmpty() }?.let { put("customData", it) }
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
