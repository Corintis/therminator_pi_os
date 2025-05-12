#!/bin/bash
set -e

# Root of your rootfs-overlay
OVERLAY_DIR="therminator_os/device/pi4/device/rootfs-overlay"

echo "🔧 Fixing permissions in: $OVERLAY_DIR"

# Ensure current user owns all files
sudo chown -R "$(whoami)" "$OVERLAY_DIR"

# Ensure all files are readable
chmod -R u+rwX "$OVERLAY_DIR"

# Ensure critical scripts are executable
chmod +x "$OVERLAY_DIR/home/therminator/.xinitrc" || true
chmod +x "$OVERLAY_DIR/home/therminator/therminator_server" || true

echo "✅ Overlay permissions fixed."
