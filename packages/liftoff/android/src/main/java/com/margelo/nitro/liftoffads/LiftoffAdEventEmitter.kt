package com.margelo.nitro.liftoffads

internal class LiftoffAdEventEmitter {
  private val lock = Any()
  private val listeners = mutableMapOf<Double, Listener>()
  private var nextSubscriptionId = 1.0

  fun add(
    eventType: LiftoffAdEventType,
    listener: (payload: LiftoffAdEventPayload?) -> Unit,
  ): Double = synchronized(lock) {
    val subscriptionId = nextSubscriptionId++
    listeners[subscriptionId] = Listener(eventType, listener)
    subscriptionId
  }

  fun remove(subscriptionId: Double) {
    synchronized(lock) { listeners.remove(subscriptionId) }
  }

  fun removeAll() {
    synchronized(lock) { listeners.clear() }
  }

  fun emit(
    eventType: LiftoffAdEventType,
    payload: LiftoffAdEventPayload? = null,
  ) {
    val callbacks = synchronized(lock) {
      listeners.values
        .filter { it.eventType == eventType }
        .map { it.callback }
    }
    callbacks.forEach { callback -> runCatching { callback(payload) } }
  }

  private data class Listener(
    val eventType: LiftoffAdEventType,
    val callback: (payload: LiftoffAdEventPayload?) -> Unit,
  )
}

internal fun Throwable.toLiftoffEventPayload(): LiftoffAdEventPayload {
  val vungleError =
    this as? com.vungle.ads.VungleError
      ?: cause as? com.vungle.ads.VungleError
  return LiftoffAdEventPayload(
    errorCode = vungleError?.code?.toDouble(),
    errorMessage = message ?: localizedMessage,
  )
}
