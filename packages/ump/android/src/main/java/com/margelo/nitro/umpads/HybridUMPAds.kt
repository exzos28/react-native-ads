package com.margelo.nitro.umpads

import android.preference.PreferenceManager
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.ump.ConsentDebugSettings
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.FormError
import com.google.android.ump.UserMessagingPlatform
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@DoNotStrip
@Keep
class HybridUMPAds : HybridUMPAdsSpec() {
  private val context: ReactApplicationContext by lazy {
    NitroModules.applicationContext as? ReactApplicationContext
      ?: error("UMP Ads requires a ReactApplicationContext")
  }

  private val consentInformation: ConsentInformation by lazy {
    UserMessagingPlatform.getConsentInformation(context.applicationContext)
  }

  override fun requestConsentInfoUpdate(
    options: UMPConsentRequestOptions?,
  ): Promise<UMPConsentInfo> = Promise.async {
    val activity = context.requireCurrentActivity()

    val params = ConsentRequestParameters.Builder()
      .setTagForUnderAgeOfConsent(options?.tagForUnderAgeOfConsent ?: false)
      .apply {
        val debugGeography = options?.debugGeography
        val testDeviceIds = options?.testDeviceIds
        if (debugGeography != null || !testDeviceIds.isNullOrEmpty()) {
          val debugSettings = ConsentDebugSettings.Builder(activity).apply {
            if (debugGeography != null) setDebugGeography(debugGeography.toNative())
            testDeviceIds?.forEach { addTestDeviceHashedId(it) }
          }.build()
          setConsentDebugSettings(debugSettings)
        }
      }
      .build()

    val deferred = CompletableDeferred<Unit>()
    withContext(Dispatchers.Main) {
      consentInformation.requestConsentInfoUpdate(
        activity,
        params,
        { deferred.complete(Unit) },
        { formError ->
          deferred.completeExceptionally(
            umpException("requestConsentInfoUpdate", formError),
          )
        },
      )
    }
    deferred.await()

    consentInfo()
  }

  override fun loadAndShowConsentFormIfRequired(): Promise<UMPConsentInfo> = Promise.async {
    val activity = context.requireCurrentActivity()

    val deferred = CompletableDeferred<Unit>()
    withContext(Dispatchers.Main) {
      UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
        if (formError != null) {
          deferred.completeExceptionally(
            umpException("loadAndShowConsentFormIfRequired", formError),
          )
        } else {
          deferred.complete(Unit)
        }
      }
    }
    deferred.await()

    consentInfo()
  }

  override fun showPrivacyOptionsForm(): Promise<UMPConsentInfo> = Promise.async {
    val activity = context.requireCurrentActivity()

    val deferred = CompletableDeferred<Unit>()
    withContext(Dispatchers.Main) {
      UserMessagingPlatform.showPrivacyOptionsForm(activity) { formError ->
        if (formError != null) {
          deferred.completeExceptionally(
            umpException("showPrivacyOptionsForm", formError),
          )
        } else {
          deferred.complete(Unit)
        }
      }
    }
    deferred.await()

    consentInfo()
  }

  override fun showForm(): Promise<UMPConsentInfo> = Promise.async {
    val activity = context.requireCurrentActivity()

    val deferred = CompletableDeferred<Unit>()
    withContext(Dispatchers.Main) {
      UserMessagingPlatform.loadConsentForm(
        context,
        { consentForm ->
          consentForm.show(activity) { formError ->
            if (formError != null) {
              deferred.completeExceptionally(umpException("showForm", formError))
            } else {
              deferred.complete(Unit)
            }
          }
        },
        { formError -> deferred.completeExceptionally(umpException("showForm", formError)) },
      )
    }
    deferred.await()

    consentInfo()
  }

  override fun getConsentInfo(): UMPConsentInfo = consentInfo()

  override fun reset() {
    consentInformation.reset()
  }

  override fun getTCString(): String = sharedPreferences().getString("IABTCF_TCString", "") ?: ""

  override fun getGdprApplies(): Boolean =
    sharedPreferences().getInt("IABTCF_gdprApplies", 0) == 1

  override fun getPurposeConsents(): String =
    sharedPreferences().getString("IABTCF_PurposeConsents", "") ?: ""

  override fun getPurposeLegitimateInterests(): String =
    sharedPreferences().getString("IABTCF_PurposeLegitimateInterests", "") ?: ""

  private fun sharedPreferences() = PreferenceManager.getDefaultSharedPreferences(context)

  private fun consentInfo(): UMPConsentInfo = UMPConsentInfo(
    status = consentInformation.consentStatus.toUMPConsentStatus(),
    isConsentFormAvailable = consentInformation.isConsentFormAvailable,
    privacyOptionsRequirementStatus =
      consentInformation.privacyOptionsRequirementStatus.toUMPStatus(),
    canRequestAds = consentInformation.canRequestAds(),
  )
}

private fun Int.toUMPConsentStatus(): UMPConsentStatus = when (this) {
  ConsentInformation.ConsentStatus.REQUIRED -> UMPConsentStatus.REQUIRED
  ConsentInformation.ConsentStatus.NOT_REQUIRED -> UMPConsentStatus.NOTREQUIRED
  ConsentInformation.ConsentStatus.OBTAINED -> UMPConsentStatus.OBTAINED
  else -> UMPConsentStatus.UNKNOWN
}

private fun ConsentInformation.PrivacyOptionsRequirementStatus.toUMPStatus():
  UMPPrivacyOptionsRequirementStatus = when (this) {
  ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED ->
    UMPPrivacyOptionsRequirementStatus.REQUIRED
  ConsentInformation.PrivacyOptionsRequirementStatus.NOT_REQUIRED ->
    UMPPrivacyOptionsRequirementStatus.NOTREQUIRED
  else -> UMPPrivacyOptionsRequirementStatus.UNKNOWN
}

private fun UMPDebugGeography.toNative(): Int = when (this) {
  UMPDebugGeography.EEA -> ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA
  UMPDebugGeography.NOTEEA -> ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_NOT_EEA
  UMPDebugGeography.DISABLED -> ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_DISABLED
}

private fun umpException(stage: String, error: FormError) =
  IllegalStateException("UMP $stage failed (${error.errorCode}): ${error.message}")
