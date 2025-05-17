#!/bin/bash

DEVICE="/dev/$1"
MOUNT_DIR="/media/$1"
LOGFILE="/tmp/usb-mount.log"

echo "$(date): Mounting $DEVICE to $MOUNT_DIR" >> "$LOGFILE"

# Wait for the device node to appear
sleep 5

# Determine who runs the script and mount accordingly
if [ -n "$DEVICE" ] && [ "$(whoami)" = "therminator" ]; then
  udisksctl mount -b "$DEVICE" >> "$LOGFILE" 2>&1
elif [ -n "$DEVICE" ]; then
  runuser -l therminator -c "udisksctl mount -b $DEVICE" >> "$LOGFILE" 2>&1
else
  echo "$(date): ❌ No device provided." >> "$LOGFILE"
  exit 1
fi

# Wait for udisksctl to finish mounting
sleep 1

# Extract the actual mount path
MOUNT_PATH=$(udisksctl info -b "$DEVICE" | grep "MountPoints:" | awk '{print $2}')

# If mounted, fix ownership and permissions
if [ -n "$MOUNT_PATH" ] && mountpoint -q "$MOUNT_PATH"; then
  echo "$(date): ✅ Successfully mounted $DEVICE at $MOUNT_PATH" >> "$LOGFILE"
else
  echo "$(date): ❌ Failed to mount $DEVICE" >> "$LOGFILE"
fi
