#!/bin/bash

DEVICE="/dev/$1"
MOUNT_DIR="/media/$1"
LOGFILE="/tmp/usb-mount.log"

echo "$(date): USB removal triggered for $DEVICE" >> "$LOGFILE"

# Attempt to unmount
if udisksctl unmount -b "$DEVICE" >> "$LOGFILE" 2>&1; then
  echo "$(date): Unmounted $DEVICE" >> "$LOGFILE"
else
  echo "$(date): Failed to unmount $DEVICE" >> "$LOGFILE"
fi

# Attempt to remove mount directory
if rm -rf "$MOUNT_DIR" >> "$LOGFILE" 2>&1; then
  echo "$(date): Removed mount directory $MOUNT_DIR" >> "$LOGFILE"
else
  echo "$(date): Could not remove $MOUNT_DIR" >> "$LOGFILE"
fi
