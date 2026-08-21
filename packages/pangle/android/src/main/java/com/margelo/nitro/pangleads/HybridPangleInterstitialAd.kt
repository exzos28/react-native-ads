package com.margelo.nitro.pangleads

import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.bytedance.sdk.openadsdk.api.interstitial.PAGInterstitialAd
import com.bytedance.sdk.openadsdk.api.interstitial.PAGInterstitialAdInteractionListener
import com.bytedance.sdk.openadsdk.api.interstitial.PAGInterstitialAdLoadListener
import com.bytedance.sdk.openadsdk.api.interstitial.PAGInterstitialRequest
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridPangleInterstitialAd(
  private val context: ReactApplicationContext,
  private val placementId: String,
) : HybridPangleInterstitialAdSpec(), PAGInterstitialAdInteractionListener {
  private val events = PangleAdEventEmitter()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var ad: PAGInterstitialAd? = null
  private var showTimeout: Runnable? = null

  override fun load() {
    context.runOnUiQueueThread {
      PAGInterstitialAd.loadAd(
        placementId,
        PAGInterstitialRequest(),
        object : PAGInterstitialAdLoadListener {
          override fun onError(code: Int, message: String) {
            mainHandler.post {
              events.emit(
                PangleAdEventType.ERROR,
                pangleException("load", code, message).toPangleEventPayload(),
              )
            }
          }

          override fun onAdLoaded(interstitialAd: PAGInterstitialAd) {
            mainHandler.post {
              interstitialAd.setAdInteractionListener(this@HybridPangleInterstitialAd)
              ad = interstitialAd
              events.emit(PangleAdEventType.LOADED)
            }
          }
        },
      )
    }
  }

  override fun show(): Promise<Unit> = Promise.async {
    withContext(Dispatchers.Main) {
      val activity = context.requireCurrentActivity()
      val current = ad ?: error("Pangle interstitial ad is not ready")
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
