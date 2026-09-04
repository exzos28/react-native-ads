import Foundation
import UIKit

let umpErrorDomain = "NitroUMPAds"

func umpError(_ message: String, code: Int = 1) -> NSError {
  NSError(
    domain: umpErrorDomain,
    code: code,
    userInfo: [NSLocalizedDescriptionKey: message]
  )
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
          throwing: umpError("Cannot request/show UMP consent without a view controller")
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
