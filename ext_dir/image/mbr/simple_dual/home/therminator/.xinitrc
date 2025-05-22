#!/bin/sh
set -e

LOGFILE="/tmp/kiosk.log"

echo "$(date): 🚀 Starting kiosk session" >> "$LOGFILE"

# Disable power management
xset -dpms
xset s off
xset s noblank

# Start Openbox (log any crashes)
openbox >> "$LOGFILE" 2>&1 &

# Set GTK file dialog scaling (for better USB/file UI)
export GDK_SCALE=2
export GDK_DPI_SCALE=0.5

# Chromium UI scale
SCALE="--force-device-scale-factor=1.25"

# Wait for the React app to start on localhost:3000
while ! nc -z localhost 3000; do
  echo "$(date): ⏳ Waiting for localhost:3000..." >> "$LOGFILE"
  sleep 0.5
done

echo "$(date): ✅ localhost:3000 is up, launching Chromium" >> "$LOGFILE"

# Launch Chromium with recommended flags
exec chromium \
  --kiosk http://localhost:3000 \
  --noerrdialogs \
  --disable-infobars \
  --disable-cursor \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --no-first-run \
  --start-maximized \
  --use-gl=egl \
  --enable-zero-copy \
  --enable-features=VaapiVideoDecoder \
  --enable-logging=stderr --v=1 \
  --disable-dev-shm-usage
  $SCALE >> "$LOGFILE" 2>&1
