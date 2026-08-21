#include <jni.h>

#include "NitroPangleAdsOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::pangleads::initialize(vm);
}
