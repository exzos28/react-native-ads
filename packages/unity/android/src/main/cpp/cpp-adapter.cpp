#include <jni.h>

#include "NitroUnityAdsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::unityads::initialize(vm);
}
