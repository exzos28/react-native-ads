import Foundation
import UIKit

let levelPlayAdsErrorDomain = "NitroLevelPlayAds"

func levelPlayAdsError(_ message: String, code: Int = 1) -> NSError {
  NSError(
    domain: levelPlayAdsErrorDomain,
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
          throwing: levelPlayAdsError("Cannot show LevelPlay ad without a view controller")
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

/// LevelPlay load/show delegates are plain callback objects with no owner —
/// this keeps them alive for the duration of a single load/show call.
enum RetainBox {
  private static let lock = NSLock()
  private static var boxes: [ObjectIdentifier: AnyObject] = [:]

  static func retain(_ object: AnyObject) {
    lock.lock()
    boxes[ObjectIdentifier(object)] = object
    lock.unlock()
  }

  static func release(_ object: AnyObject) {
    lock.lock()
    boxes.removeValue(forKey: ObjectIdentifier(object))
    lock.unlock()
  }
}
