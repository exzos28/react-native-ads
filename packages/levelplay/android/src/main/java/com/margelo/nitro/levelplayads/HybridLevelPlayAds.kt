package com.margelo.nitro.levelplayads

import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.unity3d.mediation.LevelPlay
import com.unity3d.mediation.LevelPlayAdError
import com.unity3d.mediation.LevelPlayAdInfo
import com.unity3d.mediation.LevelPlayInitError
import com.unity3d.mediation.LevelPlayInitRequest
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAd
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAdListener
import com.unity3d.mediation.rewarded.LevelPlayReward
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// Verified against the real com.ironsource.sdk:mediationsdk:9.2.0 AAR (javap on
// the downloaded classes.jar, https://android-sdk.is.com/) — the unified LevelPlay
// API lives under `com.unity3d.mediation`. LevelPlayInitRequest.Builder has no
// withLegacyAdFormats() in 9.2.0 (removed since the previous 8.6.0 generation),
// and setConsent/setMetaData/setAdaptersDebug now live on `LevelPlay` itself
// rather than the legacy `com.ironsource.mediationsdk.IronSource` facade, whose
// surface was stripped down in this release.
@DoNotStrip
@Keep
class HybridLevelPlayAds : HybridLevelPlayAdsSpec() {
  private companion object {
    const val TAG = "LevelPlayAds"
  }

  private val context: ReactApplicationContext by lazy {
    NitroModules.applicationContext as? ReactApplicationContext
      ?: error("LevelPlay requires a ReactApplicationContext")
  }

  private val stateLock = Any()
  private var isInitialized = false
  private var initializedAppKey: String? = null
  private var initializingAppKey: String? = null
  private var initialization: CompletableDeferred<Unit>? = null

  // LevelPlay requires the SDK listener to be set exactly once, before the first
  // loadAd() call, and reused for the ad's whole lifetime. Re-registering a
  // different listener object right before showAd() (as this module used to do)
  // silently drops onAdClosed on Android: the internal IronSource event fires
  // (confirmed via logcat, tag "IronSource"), but the unified
  // LevelPlayInterstitialAdListener/LevelPlayRewardedAdListener never sees it
  // once its listener has been swapped. So the SDK listener is installed once
  // in the holder's init{} block, and load()/show() only swap out our own
  // plain-Kotlin callback fields, never the SDK listener.
  private abstract class AdHolder {
    var onLoaded: (() -> Unit)? = null
    var onLoadFailed: ((LevelPlayAdError) -> Unit)? = null
    var onDisplayed: (() -> Unit)? = null
    var onDisplayFailed: ((LevelPlayAdError) -> Unit)? = null
    var onClosed: (() -> Unit)? = null
  }

  private class InterstitialHolder(adUnitId: String) : AdHolder() {
    val ad = LevelPlayInterstitialAd(adUnitId)

    init {
      ad.setListener(object : LevelPlayInterstitialAdListener {
        override fun onAdLoaded(adInfo: LevelPlayAdInfo) = onLoaded?.invoke() ?: Unit
        override fun onAdLoadFailed(error: LevelPlayAdError) = onLoadFailed?.invoke(error) ?: Unit
        override fun onAdDisplayed(adInfo: LevelPlayAdInfo) = onDisplayed?.invoke() ?: Unit
        override fun onAdDisplayFailed(error: LevelPlayAdError, adInfo: LevelPlayAdInfo) =
          onDisplayFailed?.invoke(error) ?: Unit
        override fun onAdClosed(adInfo: LevelPlayAdInfo) = onClosed?.invoke() ?: Unit
      })
    }
  }

  private class RewardedHolder(adUnitId: String) : AdHolder() {
    val ad = LevelPlayRewardedAd(adUnitId)
    var onRewarded: (() -> Unit)? = null

    init {
      ad.setListener(object : LevelPlayRewardedAdListener {
        override fun onAdLoaded(adInfo: LevelPlayAdInfo) = onLoaded?.invoke() ?: Unit
        override fun onAdLoadFailed(error: LevelPlayAdError) = onLoadFailed?.invoke(error) ?: Unit
        override fun onAdDisplayed(adInfo: LevelPlayAdInfo) = onDisplayed?.invoke() ?: Unit
        override fun onAdDisplayFailed(error: LevelPlayAdError, adInfo: LevelPlayAdInfo) =
          onDisplayFailed?.invoke(error) ?: Unit
        override fun onAdRewarded(reward: LevelPlayReward, adInfo: LevelPlayAdInfo) = onRewarded?.invoke() ?: Unit
        override fun onAdClosed(adInfo: LevelPlayAdInfo) = onClosed?.invoke() ?: Unit
      })
    }
  }

  // Keyed by adUnitId: load() and show() are separate calls in this module's
  // spec, so the loaded ad object has to be held onto between the two calls.
  private val loadedInterstitials = mutableMapOf<String, InterstitialHolder>()
  private val loadedRewarded = mutableMapOf<String, RewardedHolder>()

  override fun initialize(appKey: String, testMode: Boolean): Promise<Unit> = Promise.async {
    require(appKey.isNotBlank()) { "LevelPlay app key is empty" }

    val (deferred, shouldStart) = synchronized(stateLock) {
      if (isInitialized) {
        require(initializedAppKey == appKey) {
          "LevelPlay SDK was already initialized with another app key"
        }
        return@async
      }

      val current = initialization
      if (current != null) {
        require(initializingAppKey == appKey) {
          "LevelPlay SDK is being initialized with another app key"
        }
        current to false
      } else {
        CompletableDeferred<Unit>().also {
          initialization = it
          initializingAppKey = appKey
        } to true
      }
    }

    if (shouldStart) {
      withContext(Dispatchers.Main) {
        if (testMode) {
          LevelPlay.setAdaptersDebug(true)
        }

        val initRequest = LevelPlayInitRequest.Builder(appKey).build()

        LevelPlay.init(
          context,
          initRequest,
          object : com.unity3d.mediation.LevelPlayInitListener {
            override fun onInitSuccess(configuration: com.unity3d.mediation.LevelPlayConfiguration) {
              synchronized(stateLock) {
                isInitialized = true
                initializedAppKey = appKey
                initialization = null
                initializingAppKey = null
              }
              deferred.complete(Unit)
            }

            override fun onInitFailed(error: LevelPlayInitError) {
              synchronized(stateLock) {
                initialization = null
                initializingAppKey = null
              }
              deferred.completeExceptionally(
                levelPlayAdsException("initialize", error.errorCode.toString(), error.errorMessage),
              )
            }
          },
        )
      }
    }

    deferred.await()
  }

  override fun load(adType: LevelPlayAdType, adUnitId: String): Promise<Unit> = Promise.async {
    require(adUnitId.isNotBlank()) { "LevelPlay ad unit ID is empty" }
    val deferred = CompletableDeferred<Unit>()

    withContext(Dispatchers.Main) {
      when (adType) {
        LevelPlayAdType.INTERSTITIAL -> {
          val holder = InterstitialHolder(adUnitId)
          holder.onLoaded = {
            synchronized(stateLock) { loadedInterstitials[adUnitId] = holder }
            deferred.complete(Unit)
          }
          holder.onLoadFailed = { error ->
            deferred.completeExceptionally(
              levelPlayAdsException("load", error.getErrorCode().toString(), error.getErrorMessage()),
            )
          }
          holder.ad.loadAd()
        }
        LevelPlayAdType.REWARDED -> {
          val holder = RewardedHolder(adUnitId)
          holder.onLoaded = {
            synchronized(stateLock) { loadedRewarded[adUnitId] = holder }
            deferred.complete(Unit)
          }
          holder.onLoadFailed = { error ->
            deferred.completeExceptionally(
              levelPlayAdsException("load", error.getErrorCode().toString(), error.getErrorMessage()),
            )
          }
          holder.ad.loadAd()
        }
      }
    }

    deferred.await()
  }

  private fun onShowDisplayFailed(
    kind: String,
    adUnitId: String,
    error: LevelPlayAdError,
    deferred: CompletableDeferred<*>,
  ) {
    Log.d(TAG, "show($kind, $adUnitId): onAdDisplayFailed (${error.getErrorCode()}) ${error.getErrorMessage()}")
    deferred.completeExceptionally(
      levelPlayAdsException("show", error.getErrorCode().toString(), error.getErrorMessage()),
    )
  }

  override fun show(adType: LevelPlayAdType, adUnitId: String): Promise<LevelPlayAdShowResult> = Promise.async {
    require(adUnitId.isNotBlank()) { "LevelPlay ad unit ID is empty" }
    val activity = context.requireCurrentActivity()
    val deferred = CompletableDeferred<LevelPlayAdShowResult>()

    when (adType) {
      LevelPlayAdType.INTERSTITIAL -> {
        val holder = synchronized(stateLock) { loadedInterstitials.remove(adUnitId) }
          ?: error("LevelPlay interstitial ad is not ready")
        // Reuse the same SDK listener that was registered in load() — swapping
        // in a different listener object here is what used to drop onAdClosed.
        holder.onLoaded = null
        holder.onLoadFailed = null
        holder.onDisplayed = {
          Log.d(TAG, "show(interstitial, $adUnitId): onAdDisplayed")
        }
        holder.onDisplayFailed = { error -> onShowDisplayFailed("interstitial", adUnitId, error, deferred) }
        holder.onClosed = {
          Log.d(TAG, "show(interstitial, $adUnitId): onAdClosed")
          deferred.complete(LevelPlayAdShowResult(LevelPlayAdShowState.COMPLETED))
        }
        Log.d(TAG, "show(interstitial, $adUnitId): calling showAd")
        withContext(Dispatchers.Main) { holder.ad.showAd(activity) }
      }
      LevelPlayAdType.REWARDED -> {
        val holder = synchronized(stateLock) { loadedRewarded.remove(adUnitId) }
          ?: error("LevelPlay rewarded ad is not ready")
        // Rewarded ads don't carry a Unity-style "finish state" — LevelPlay fires a
        // separate onAdRewarded event before onAdClosed, so completion is derived
        // from whether that event happened at all before the ad closed.
        var didReceiveReward = false
        holder.onLoaded = null
        holder.onLoadFailed = null
        holder.onDisplayed = {
          Log.d(TAG, "show(rewarded, $adUnitId): onAdDisplayed")
        }
        holder.onRewarded = {
          Log.d(TAG, "show(rewarded, $adUnitId): onAdRewarded")
          didReceiveReward = true
        }
        holder.onDisplayFailed = { error -> onShowDisplayFailed("rewarded", adUnitId, error, deferred) }
        holder.onClosed = {
          Log.d(TAG, "show(rewarded, $adUnitId): onAdClosed (didReceiveReward=$didReceiveReward)")
          val state = if (didReceiveReward) {
            LevelPlayAdShowState.COMPLETED
          } else {
            LevelPlayAdShowState.SKIPPED
          }
          deferred.complete(LevelPlayAdShowResult(state))
        }
        Log.d(TAG, "show(rewarded, $adUnitId): calling showAd")
        withContext(Dispatchers.Main) { holder.ad.showAd(activity) }
      }
    }

    deferred.await()
  }

  override fun setGDPRConsent(optIn: Boolean) {
    LevelPlay.setConsent(optIn)
  }

  // CCPA flag semantics are "opted out of sale", the inverse of our `optIn`
  // (personalized-ads-allowed) flag.
  override fun setCCPAConsent(optIn: Boolean) {
    LevelPlay.setMetaData("do_not_sell", if (optIn) "false" else "true")
  }

  override fun setCOPPA(isCoppa: Boolean) {
    LevelPlay.setMetaData("is_child_directed", if (isCoppa) "true" else "false")
  }
}
