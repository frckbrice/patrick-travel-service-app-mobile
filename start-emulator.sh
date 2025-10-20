#!/bin/bash

# Patrick Travel Services - Default Emulator Startup Script
# This script ensures Pixel_9_Pro_XL is always used

echo "🧹 Cleaning up any running emulators..."
killall qemu-system-x86_64 2>/dev/null

echo "🚀 Starting Pixel_9_Pro_XL emulator..."
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &

echo "⏳ Waiting for emulator to boot..."
adb wait-for-device

# Wait for system to fully boot
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
  sleep 1
done

echo "✅ Pixel_9_Pro_XL emulator is ready!"
adb devices -l

