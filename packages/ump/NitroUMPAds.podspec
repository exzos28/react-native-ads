require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroUMPAds"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/exzos28/react-native-ads/tree/main/packages/ump"
  s.license      = { :type => "MIT" }
  s.authors      = { "exzos" => "oleksandr.kurinnyi.work@gmail.com" }
  s.platforms    = { :ios => "15.1" }
  s.source       = { :path => "." }

  s.source_files = ["ios/**/*.{swift,m,mm}"]

  load "nitrogen/generated/ios/NitroUMPAds+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-Core"
  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  s.dependency "GoogleUserMessagingPlatform", "3.1.0"

  install_modules_dependencies(s)
end
