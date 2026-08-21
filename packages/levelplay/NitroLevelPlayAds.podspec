require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroLevelPlayAds"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/exzos28/react-native-ads/tree/main/packages/levelplay"
  s.license      = { :type => "MIT" }
  s.authors      = { "exzos" => "oleksandr.kurinnyi.work@gmail.com" }
  s.platforms    = { :ios => "15.1" }
  s.source       = { :path => "." }

  s.source_files = ["ios/**/*.{swift,m,mm}"]

  load "nitrogen/generated/ios/NitroLevelPlayAds+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-Core"
  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  # Verified against CocoaPods trunk (https://trunk.cocoapods.org/api/v1/pods/IronSourceSDK) —
  # the real pod name is "IronSourceSDK" (module name `IronSource`), not "IronSourceMediation".
  s.dependency "IronSourceSDK", "~> 9.5.0.0"

  install_modules_dependencies(s)
end
