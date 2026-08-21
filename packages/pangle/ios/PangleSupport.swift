import Foundation
import UIKit

let pangleErrorDomain = "NitroPangleAds"

// PAGLInterstitialAdDelegate/PAGRewardedAdDelegate do call adDidShowFail on a
// known show failure, but a show() the SDK silently drops (no callback at
// all) would otherwise leave the caller awaiting CLOSED/ERROR forever.
let pangleShowTimeoutInterval: TimeInterval = 10

func pangleError(_ message: String, code: Int = 1) -> NSError {
  NSError(
    domain: pangleErrorDomain,
    code: code,
    userInfo: [NSLocalizedDescriptionKey: message]
  )
}

/// Arms a fallback timeout for a show() call; disarm it once a real
/// delegate callback fires. If it fires, `onTimeout` runs on the main queue.
final class PangleShowTimeoutController {
  private var workItem: DispatchWorkItem?

  func arm(_ onTimeout: @escaping () -> Void) {
    disarm()
    let item = DispatchWorkItem(block: onTimeout)
    workItem = item
    DispatchQueue.main.asyncAfter(deadline: .now() + pangleShowTimeoutInterval, execute: item)
  }

  func disarm() {
    workItem?.cancel()
    workItem = nil
  }
}

func runOnMain(_ body: @escaping () -> Void) {
  if Thread.isMainThread {
    body()
  } else {
    DispatchQueue.main.sync(execute: body)
  }
}

func currentViewController() async throws -> UIViewController {
  try await withCheckedThrowingContinuation { continuation in
    DispatchQueue.main.async {
      let root = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap(\.windows)
        .first(where: \.isKeyWindow)?
        .rootViewController

      guard let root else {
        continuation.resume(
          throwing: pangleError("Cannot show Pangle ad without a view controller")
        )
        return
      }
      continuation.resume(returning: topViewController(root))
    }
  }
}

private func topViewController(_ viewController: UIViewController) -> UIViewController {
  if let presented = viewController.presentedViewController {
    return topViewController(presented)
  }
  if let navigation = viewController as? UINavigationController,
     let visible = navigation.visibleViewController {
    return topViewController(visible)
  }
  if let tab = viewController as? UITabBarController,
     let selected = tab.selectedViewController {
    return topViewController(selected)
  }
  return viewController
}

final class PangleAdEventEmitter {
  typealias Listener = (PangleAdEventPayload?) -> Void

  private let lock = NSLock()
  private var listeners: [Double: (eventType: String, listener: Listener)] = [:]
  private var nextSubscriptionId = 1.0

  func add(eventType: PangleAdEventType, listener: @escaping Listener) -> Double {
    lock.lock()
    defer { lock.unlock() }

    let subscriptionId = nextSubscriptionId
    nextSubscriptionId += 1
    listeners[subscriptionId] = (eventType.stringValue, listener)
    return subscriptionId
  }

  func remove(subscriptionId: Double) {
    lock.lock()
    listeners.removeValue(forKey: subscriptionId)
    lock.unlock()
  }

  func removeAll() {
    lock.lock()
    listeners.removeAll()
    lock.unlock()
  }

  func emit(
    _ eventType: PangleAdEventType,
    error: Error? = nil,
    payload: PangleAdEventPayload? = nil
  ) {
    lock.lock()
    let callbacks = listeners.values
      .filter { $0.eventType == eventType.stringValue }
      .map(\.listener)
    lock.unlock()

    let resolvedPayload = payload ?? error.map { error in
      let nsError = error as NSError
      return PangleAdEventPayload(
        errorCode: Double(nsError.code),
        errorMessage: nsError.localizedDescription
      )
    }
    callbacks.forEach { $0(resolvedPayload) }
  }
}
