#include <jni.h>

#include "NitroUMPAdsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::umpads::initialize(vm);
}
