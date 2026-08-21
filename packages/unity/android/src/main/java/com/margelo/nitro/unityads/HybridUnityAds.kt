package com.margelo.nitro.unityads

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.unity3d.ads.InitializationConfiguration
import com.unity3d.ads.InitializationListener
import com.unity3d.ads.InterstitialAd
import com.unity3d.ads.InterstitialShowListener
import com.unity3d.ads.LoadConfiguration
import com.unity3d.ads.LoadListener
import com.unity3d.ads.RewardedAd
import com.unity3d.ads.RewardedShowListener
import com.unity3d.ads.ShowConfiguration
import com.unity3d.ads.ShowFinishState
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsError
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridUnityAds : HybridUnityAdsSpec() {
  private val context: ReactApplicationContext by lazy {
    NitroModules.applicationContext as? ReactApplicationContext
      ?: error("Unity Ads requires a ReactApplicationContext")
  }

  private val stateLock = Any()
  private var isInitialized = false
  private var initializedGameId: String? = null
  private var initializingGameId: String? = null
  private var initialization: CompletableDeferred<Unit>? = null

  // Keyed by placementId: load() and show() are separate calls in this module's
  // spec, but UnityAds 4.x's typed API requires holding onto the loaded ad object
  // between the two calls (there's no global placementId-based registry anymore).
  private val loadedInterstitials = mutableMapOf<String, InterstitialAd>()
  private val loadedRewarded = mutableMapOf<String, RewardedAd>()

  override fun initialize(gameId: String, testMode: Boolean): Promise<Unit> = Promise.async {
    require(gameId.isNotBlank()) { "Unity Ads game ID is empty" }

    val (deferred, shouldStart) = synchronized(stateLock) {
      if (isInitialized) {
        require(initializedGameId == gameId) {
          "Unity Ads SDK was already initialized with another game ID"
        }
        return@async
      }

      val current = initialization
      if (current != null) {
        require(initializingGameId == gameId) {
          "Unity Ads SDK is being initialized with another game ID"
        }
        current to false
      } else {
        CompletableDeferred<Unit>().also {
          initialization = it
          initializingGameId = gameId
        } to true
      }
    }

    if (shouldStart) {
      withContext(Dispatchers.Main) {
        val configuration = InitializationConfiguration.Builder(gameId)
          .withTestMode(testMode)
          .build()
        UnityAds.initialize(
          configuration,
          object : InitializationListener {
            override fun onInitializationComplete(error: UnityAdsError?) {
              synchronized(stateLock) {
                if (error == null) {
                  isInitialized = true
                  initializedGameId = gameId
                }
                initialization = null
                initializingGameId = null
              }
              if (error == null) {
                deferred.complete(Unit)
              } else {
                deferred.completeExceptionally(
                  unityAdsException("initialize", error.code.toString(), error.message),
                )
              }
            }
          },
        )
      }
    }

    deferred.await()
  }

  override fun load(adType: UnityAdType, placementId: String): Promise<Unit> = Promise.async {
    require(placementId.isNotBlank()) { "Unity Ads placement ID is empty" }
    val configuration = LoadConfiguration.Builder(placementId).build()
    val deferred = CompletableDeferred<Unit>()

    withContext(Dispatchers.Main) {
      when (adType) {
        UnityAdType.INTERSTITIAL -> InterstitialAd.load(
          configuration,
          object : LoadListener<InterstitialAd> {
            override fun onAdLoaded(ad: InterstitialAd?, error: UnityAdsError?) {
              if (error != null || ad == null) {
                deferred.completeExceptionally(
                  unityAdsException(
                    "load",
                    (error?.code ?: -1).toString(),
                    error?.message ?: "Unity interstitial ad failed to load",
                  ),
                )
                return
              }
              synchronized(stateLock) { loadedInterstitials[placementId] = ad }
              deferred.complete(Unit)
            }
          },
        )
        UnityAdType.REWARDED -> RewardedAd.load(
          configuration,
          object : LoadListener<RewardedAd> {
            override fun onAdLoaded(ad: RewardedAd?, error: UnityAdsError?) {
              if (error != null || ad == null) {
                deferred.completeExceptionally(
                  unityAdsException(
                    "load",
                    (error?.code ?: -1).toString(),
                    error?.message ?: "Unity rewarded ad failed to load",
                  ),
                )
                return
              }
              synchronized(stateLock) { loadedRewarded[placementId] = ad }
              deferred.complete(Unit)
            }
          },
        )
      }
    }

    deferred.await()
  }

  override fun show(
    adType: UnityAdType,
    placementId: String,
    verification: UnityAdVerificationOptions?,
  ): Promise<UnityAdShowResult> = Promise.async {
    require(placementId.isNotBlank()) { "Unity Ads placement ID is empty" }
    val showConfiguration = buildShowConfiguration(verification)

    when (adType) {
      UnityAdType.INTERSTITIAL -> showInterstitial(placementId, showConfiguration)
      UnityAdType.REWARDED -> showRewarded(placementId, showConfiguration)
    }
  }

  private fun buildShowConfiguration(verification: UnityAdVerificationOptions?): ShowConfiguration {
    val builder = ShowConfiguration.Builder()
    val extras = extrasFrom(verification)
    if (extras.isNotEmpty()) {
      builder.withExtras(extras)
    }
    return builder.build()
  }

  private fun extrasFrom(verification: UnityAdVerificationOptions?): Map<String, String> = buildMap {
    verification?.userId?.takeIf { it.isNotEmpty() }?.let { put("userId", it) }
    verification?.customData?.takeIf { it.isNotEmpty() }?.let { put("customData", it) }
  }

  private suspend fun showInterstitial(
    placementId: String,
    showConfiguration: ShowConfiguration,
  ): UnityAdShowResult {
    val ad = synchronized(stateLock) { loadedInterstitials.remove(placementId) }
      ?: error("Unity interstitial ad is not ready")
    val activity = context.requireCurrentActivity()
    val deferred = CompletableDeferred<UnityAdShowResult>()

    withContext(Dispatchers.Main) {
      ad.show(
        activity,
        showConfiguration,
        object : InterstitialShowListener {
          override fun onStarted(unityAd: InterstitialAd) = Unit

          override fun onClicked(unityAd: InterstitialAd) = Unit

          override fun onCompleted(unityAd: InterstitialAd, finishState: ShowFinishState) {
            deferred.complete(UnityAdShowResult(finishState.toUnityAdShowState()))
          }

          override fun onFailed(unityAd: InterstitialAd, error: UnityAdsError) {
            deferred.completeExceptionally(
              unityAdsException("show", error.code.toString(), error.message),
            )
          }
        },
      )
    }

    return deferred.await()
  }

  private suspend fun showRewarded(
    placementId: String,
    showConfiguration: ShowConfiguration,
  ): UnityAdShowResult {
    val ad = synchronized(stateLock) { loadedRewarded.remove(placementId) }
      ?: error("Unity rewarded ad is not ready")
    val activity = context.requireCurrentActivity()
    val deferred = CompletableDeferred<UnityAdShowResult>()

    withContext(Dispatchers.Main) {
      ad.show(
        activity,
        showConfiguration,
        object : RewardedShowListener {
          override fun onStarted(unityAd: RewardedAd) = Unit

          override fun onClicked(unityAd: RewardedAd) = Unit

          override fun onRewarded(unityAd: RewardedAd) = Unit

          override fun onCompleted(unityAd: RewardedAd, finishState: ShowFinishState) {
            deferred.complete(UnityAdShowResult(finishState.toUnityAdShowState()))
          }

          override fun onFailed(unityAd: RewardedAd, error: UnityAdsError) {
            deferred.completeExceptionally(
              unityAdsException("show", error.code.toString(), error.message),
            )
          }
        },
      )
    }

    return deferred.await()
  }

  private fun ShowFinishState.toUnityAdShowState(): UnityAdShowState =
    if (this == ShowFinishState.COMPLETED) UnityAdShowState.COMPLETED else UnityAdShowState.SKIPPED

  // UnityAds 4.19 exposes a single user-consent flag rather than separate
  // GDPR/CCPA signals, matching the old MetaData("gdpr.consent"/"privacy.consent")
  // behavior this replaces (both were already written un-inverted from `optIn`).
  override fun setGDPRConsent(optIn: Boolean) {
    UnityAds.userConsent = optIn
  }

  override fun setCCPAConsent(optIn: Boolean) {
    UnityAds.userConsent = optIn
  }

  override fun setCOPPA(isCoppa: Boolean) {
    UnityAds.nonBehavioral = isCoppa
  }
}
