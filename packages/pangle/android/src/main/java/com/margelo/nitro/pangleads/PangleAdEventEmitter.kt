package com.margelo.nitro.pangleads

internal class PangleAdEventEmitter {
  private val lock = Any()
  private val listeners = mutableMapOf<Double, Listener>()
  private var nextSubscriptionId = 1.0

  fun add(
    eventType: PangleAdEventType,
    listener: (payload: PangleAdEventPayload?) -> Unit,
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
    eventType: PangleAdEventType,
    payload: PangleAdEventPayload? = null,
  ) {
    val callbacks = synchronized(lock) {
      listeners.values
        .filter { it.eventType == eventType }
        .map { it.callback }
    }
    callbacks.forEach { callback -> runCatching { callback(payload) } }
  }

  private data class Listener(
    val eventType: PangleAdEventType,
    val callback: (payload: PangleAdEventPayload?) -> Unit,
  )
}
