#include <jni.h>

#include "NitroLiftoffAdsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::liftoffads::initialize(vm);
}
