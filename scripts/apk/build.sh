#!/bin/bash
# Builds android/dist/anipoex-<version>.apk, signed with the release key, from the prebuilt
# android/ project. The key is the one keystore.properties names at the repo
# root (storeFile, storePassword, keyAlias, keyPassword); CI writes both.
set -euo pipefail
cd "$(dirname "$0")/../.."

# SHA-256 of the release key's certificate: an APK signed by anything else fails.
SIGNING_CERT_SHA256=3f14029f2326727b91496550d62c35c6e3f2160eb6bdfec23a32a72008b62479

if [[ ! -f keystore.properties ]]; then
  echo "keystore.properties not found: put it and the .jks at the repo root" >&2
  exit 1
fi
prop() { sed -n "s/^$1=//p" keystore.properties | tr -d '\r' | tail -1; }
store="$(prop storeFile)"
[[ "$store" == /* ]] || store="$PWD/$store"
store_password="$(prop storePassword)"
key_alias="$(prop keyAlias)"
key_password="$(prop keyPassword)"

(cd android && ./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
  -Pandroid.injected.signing.store.file="$store" \
  -Pandroid.injected.signing.store.password="$store_password" \
  -Pandroid.injected.signing.key.alias="$key_alias" \
  -Pandroid.injected.signing.key.password="$key_password")

built=android/app/build/outputs/apk/release/app-release.apk
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
tools="$(find "$sdk/build-tools" -mindepth 1 -maxdepth 1 | sort -V | tail -1)"
version="$("$tools/aapt2" dump badging "$built" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")"
apk="android/dist/anipoex-$version.apk"
mkdir -p android/dist
cp "$built" "$apk"
# R8's map, to read a crash's obfuscated stack trace from this exact build.
cp android/app/build/outputs/mapping/release/mapping.txt "android/dist/anipoex-$version-mapping.txt"
apksigner="$tools/apksigner"
certs="$("$apksigner" verify --print-certs "$apk")"
grep -q "SHA-256 digest: $SIGNING_CERT_SHA256" <<<"$certs"
echo "Built $apk"
