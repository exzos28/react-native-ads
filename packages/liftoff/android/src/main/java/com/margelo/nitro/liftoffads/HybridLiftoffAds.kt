package com.margelo.nitro.liftoffads

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.vungle.ads.InitializationListener
import com.vungle.ads.VungleAds
import com.vungle.ads.VungleError
import com.vungle.ads.VunglePrivacySettings
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridLiftoffAds : HybridLiftoffAdsSpec() {
  private val context: ReactApplicationContext by lazy {
    NitroModules.applicationContext as? ReactApplicationContext
      ?: error("Liftoff Ads requires a ReactApplicationContext")
  }

  private val stateLock = Any()
  private var initializedAppId: String? = null
  private var initializingAppId: String? = null
  private var initialization: CompletableDeferred<Unit>? = null

  override fun initialize(appId: String): Promise<Unit> = Promise.async {
    require(appId.isNotBlank()) { "Liftoff app ID is empty" }

    val alreadyInitialized = synchronized(stateLock) {
      if (VungleAds.isInitialized()) {
        val existing = initializedAppId
        if (existing != null && existing != appId) {
          error("Liftoff SDK was already initialized with another app ID")
        }
        initializedAppId = appId
        true
      } else {
        false
      }
    }
    if (alreadyInitialized) return@async

    val (deferred, shouldStart) = synchronized(stateLock) {
      val current = initialization
      if (current != null) {
        if (initializingAppId != appId) {
          error("Liftoff SDK is being initialized with another app ID")
        }
        current to false
      } else {
        CompletableDeferred<Unit>().also {
          initialization = it
          initializingAppId = appId
        } to true
      }
    }

    if (shouldStart) {
      withContext(Dispatchers.Main) {
        VungleAds.init(
          context.applicationContext,
          appId,
          object : InitializationListener {
            override fun onSuccess() {
              synchronized(stateLock) {
                initializedAppId = appId
                initialization = null
                initializingAppId = null
              }
              deferred.complete(Unit)
            }

            override fun onError(vungleError: VungleError) {
              synchronized(stateLock) {
                if (initialization === deferred) initialization = null
                initializingAppId = null
              }
              deferred.completeExceptionally(
                liftoffException("initialize", vungleError),
              )
            }
          },
        )
      }
    }

    deferred.await()
  }

  override fun setGDPRConsent(optIn: Boolean, consentMessageVersion: String) {
    VunglePrivacySettings.setGDPRStatus(optIn, consentMessageVersion)
  }

  override fun setCCPAConsent(optIn: Boolean) {
    VunglePrivacySettings.setCCPAStatus(optIn)
  }

  override fun setCOPPA(isUserCoppa: Boolean) {
    VunglePrivacySettings.setCOPPAStatus(isUserCoppa)
  }

  override fun createInterstitialAd(
    placementId: String,
  ): HybridLiftoffInterstitialAdSpec {
    requireInitialized(placementId)
    return HybridLiftoffInterstitialAd(context, placementId)
  }

  override fun createRewardedAd(placementId: String): HybridLiftoffRewardedAdSpec {
    requireInitialized(placementId)
    return HybridLiftoffRewardedAd(context, placementId)
  }

  private fun requireInitialized(placementId: String) {
    require(VungleAds.isInitialized()) { "Liftoff SDK is not initialized" }
    require(placementId.isNotBlank()) { "Liftoff placement ID is empty" }
  }
}
