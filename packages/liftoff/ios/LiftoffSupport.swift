import Foundation
import UIKit

let liftoffErrorDomain = "NitroLiftoffAds"

func liftoffError(_ message: String, code: Int = 1) -> NSError {
  NSError(
    domain: liftoffErrorDomain,
    code: code,
    userInfo: [NSLocalizedDescriptionKey: message]
  )
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
          throwing: liftoffError("Cannot show Liftoff ad without a view controller")
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

final class LiftoffAdEventEmitter {
  typealias Listener = (LiftoffAdEventPayload?) -> Void

  private let lock = NSLock()
  private var listeners: [Double: (eventType: String, listener: Listener)] = [:]
  private var nextSubscriptionId = 1.0

  func add(eventType: LiftoffAdEventType, listener: @escaping Listener) -> Double {
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
    _ eventType: LiftoffAdEventType,
    error: Error? = nil,
    payload: LiftoffAdEventPayload? = nil
  ) {
    lock.lock()
    let callbacks = listeners.values
      .filter { $0.eventType == eventType.stringValue }
      .map(\.listener)
    lock.unlock()

    let resolvedPayload = payload ?? error.map { error in
      let nsError = error as NSError
      return LiftoffAdEventPayload(
        errorCode: Double(nsError.code),
        errorMessage: nsError.localizedDescription
      )
    }
    callbacks.forEach { $0(resolvedPayload) }
  }
}
