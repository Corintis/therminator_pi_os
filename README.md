# Therminator OS - Image builder
Author: Nicola Esposito

The build process has been tested on both ARM64 Mac and AMD64 Mac laptops.

# configure for your target board

In `therminator_os/config/therminator_os.cfg` you will need to set the device class to either
pi4 or pi5 depending on your board

# build and install

```sh
./build.sh
```

Use the Raspberry Pi Imager tool to install the img file located in deploy
on an SD card or USB stick.

