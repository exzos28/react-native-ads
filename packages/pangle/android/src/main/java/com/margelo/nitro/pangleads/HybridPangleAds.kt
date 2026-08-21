package com.margelo.nitro.pangleads

import androidx.annotation.Keep
import com.bytedance.sdk.openadsdk.api.PAGConstant.PAGPAConsentType
import com.bytedance.sdk.openadsdk.api.init.PAGConfig
import com.bytedance.sdk.openadsdk.api.init.PAGSdk
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridPangleAds : HybridPangleAdsSpec() {
  private val context: ReactApplicationContext by lazy {
    NitroModules.applicationContext as? ReactApplicationContext
      ?: error("Pangle Ads requires a ReactApplicationContext")
  }

  private val stateLock = Any()
  private var initializedAppId: String? = null
  private var initializingAppId: String? = null
  private var initialization: CompletableDeferred<Unit>? = null

  override fun initialize(appId: String): Promise<Unit> = Promise.async {
    require(appId.isNotBlank()) { "Pangle app ID is empty" }

    val alreadyInitialized = synchronized(stateLock) {
      val existing = initializedAppId
      if (existing != null && existing != appId) {
        error("Pangle SDK was already initialized with another app ID")
      }
      existing == appId
    }
    if (alreadyInitialized) return@async

    val (deferred, shouldStart) = synchronized(stateLock) {
      val current = initialization
      if (current != null) {
        if (initializingAppId != appId) {
          error("Pangle SDK is being initialized with another app ID")
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
      val config = PAGConfig.Builder().appId(appId).build()
      withContext(Dispatchers.Main) {
        PAGSdk.init(
          context.applicationContext,
          config,
          object : PAGSdk.PAGInitCallback {
            override fun success() {
              synchronized(stateLock) {
                initializedAppId = appId
                initialization = null
                initializingAppId = null
              }
              deferred.complete(Unit)
            }

            override fun fail(code: Int, msg: String) {
              synchronized(stateLock) {
                if (initialization === deferred) initialization = null
                initializingAppId = null
              }
              deferred.completeExceptionally(pangleException("initialize", code, msg))
            }
          },
        )
      }
    }

    deferred.await()
  }

  // pag-sdk 8.x collapsed the separate GDPR/DoNotSell/ChildDirected APIs into a single
  // PAConsent flag, so GDPR/CCPA consent are no longer distinguishable, and there is no
  // longer a public way to flag child-directed (COPPA) traffic to Pangle on Android.
  override fun setGDPRConsent(optIn: Boolean) {
    PAGConfig.setPAConsent(
      if (optIn) PAGPAConsentType.PAG_PA_CONSENT_TYPE_CONSENT
      else PAGPAConsentType.PAG_PA_CONSENT_TYPE_NO_CONSENT,
    )
  }

  override fun setCCPAConsent(optIn: Boolean) {
    PAGConfig.setPAConsent(
      if (optIn) PAGPAConsentType.PAG_PA_CONSENT_TYPE_CONSENT
      else PAGPAConsentType.PAG_PA_CONSENT_TYPE_NO_CONSENT,
    )
  }

  override fun setCOPPA(isUserCoppa: Boolean) {}

  override fun createInterstitialAd(
    placementId: String,
  ): HybridPangleInterstitialAdSpec {
    requireInitialized(placementId)
    return HybridPangleInterstitialAd(context, placementId)
  }

  override fun createRewardedAd(placementId: String): HybridPangleRewardedAdSpec {
    requireInitialized(placementId)
    return HybridPangleRewardedAd(context, placementId)
  }

  private fun requireInitialized(placementId: String) {
    require(synchronized(stateLock) { initializedAppId != null }) {
      "Pangle SDK is not initialized"
    }
    require(placementId.isNotBlank()) { "Pangle placement ID is empty" }
  }
}
