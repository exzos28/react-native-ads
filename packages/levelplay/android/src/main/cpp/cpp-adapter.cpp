#include <jni.h>

#include "NitroLevelPlayAdsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::levelplayads::initialize(vm);
}
