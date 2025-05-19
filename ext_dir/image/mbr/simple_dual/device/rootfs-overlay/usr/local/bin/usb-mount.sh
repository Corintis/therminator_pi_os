#!/bin/bash

DEVICE="/dev/$1"
MOUNT_DIR="/media/$1"
LOGFILE="/tmp/usb-mount.log"

echo "$(date): Mounting $DEVICE to $MOUNT_DIR" >> "$LOGFILE"

# Wait for the device node to appear
sleep 1

# Determine who runs the script and mount accordingly
udisksctl mount -b "$DEVICE" >> "$LOGFILE" 2>&1


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
