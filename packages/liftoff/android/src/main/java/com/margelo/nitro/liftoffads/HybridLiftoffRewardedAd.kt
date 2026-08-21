package com.margelo.nitro.liftoffads

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.core.Promise
import com.vungle.ads.AdConfig
import com.vungle.ads.BaseAd
import com.vungle.ads.RewardedAd
import com.vungle.ads.RewardedAdListener
import com.vungle.ads.VungleError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridLiftoffRewardedAd(
  private val context: ReactApplicationContext,
  placementId: String,
) : HybridLiftoffRewardedAdSpec(), RewardedAdListener {
  private val events = LiftoffAdEventEmitter()
  private val immersiveMode = ImmersiveModeController()
  private val ad = RewardedAd(context, placementId, AdConfig())

  init {
    ad.adListener = this
  }

  override fun load() {
    context.runOnUiQueueThread { ad.load() }
  }

  override fun setUserId(userId: String) {
    context.runOnUiQueueThread { ad.setUserId(userId) }
  }

  override fun show(options: LiftoffAdShowOptions?): Promise<Unit> = Promise.async {
    try {
      withContext(Dispatchers.Main) {
        val activity = context.requireCurrentActivity()
        if (!ad.canPlayAd()) error("Liftoff rewarded ad is not ready")
        if (options?.immersiveModeEnabled == true) immersiveMode.enable(activity)
        ad.play(activity)
      }
    } catch (error: Throwable) {
      immersiveMode.restore()
      events.emit(LiftoffAdEventType.ERROR, error.toLiftoffEventPayload())
      throw error
    }
  }

  override fun addAdEventListener(
    eventType: LiftoffAdEventType,
    listener: (payload: LiftoffAdEventPayload?) -> Unit,
  ) = events.add(eventType, listener)

  override fun removeAdEventListener(subscriptionId: Double) {
    events.remove(subscriptionId)
  }

  override fun removeAllListeners() {
    events.removeAll()
  }

  override fun onAdLoaded(baseAd: BaseAd) {
    events.emit(LiftoffAdEventType.REWARDED_LOADED)
  }

  override fun onAdStart(baseAd: BaseAd) {
    events.emit(LiftoffAdEventType.OPENED)
  }

  override fun onAdImpression(baseAd: BaseAd) = Unit

  override fun onAdClicked(baseAd: BaseAd) {
    events.emit(LiftoffAdEventType.CLICKED)
  }

  override fun onAdLeftApplication(baseAd: BaseAd) = Unit

  override fun onAdRewarded(baseAd: BaseAd) {
    events.emit(LiftoffAdEventType.REWARDED_EARNED_REWARD)
  }

  override fun onAdEnd(baseAd: BaseAd) {
    immersiveMode.restore()
    events.emit(LiftoffAdEventType.CLOSED)
  }

  override fun onAdFailedToLoad(baseAd: BaseAd, adError: VungleError) {
    events.emit(
      LiftoffAdEventType.ERROR,
      liftoffException("load", adError).toLiftoffEventPayload(),
    )
  }

  override fun onAdFailedToPlay(baseAd: BaseAd, adError: VungleError) {
    immersiveMode.restore()
    events.emit(
      LiftoffAdEventType.ERROR,
      liftoffException("show", adError).toLiftoffEventPayload(),
    )
  }
}
