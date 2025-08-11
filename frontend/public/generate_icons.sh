#!/bin/zsh

# Script to generate Mac icons from icon.png
# Requires ImageMagick: brew install imagemagick

if ! command -v magick &> /dev/null; then
    echo "ImageMagick not found. Installing..."
    brew install imagemagick
fi

echo "Generating Mac icons from icon.png..."

# Create iconset directory
mkdir -p icon.iconset

# Generate different sizes
magick icon.png -resize 16x16 icon.iconset/icon_16x16.png
magick icon.png -resize 32x32 icon.iconset/icon_16x16@2x.png
magick icon.png -resize 32x32 icon.iconset/icon_32x32.png
magick icon.png -resize 64x64 icon.iconset/icon_32x32@2x.png
magick icon.png -resize 128x128 icon.iconset/icon_128x128.png
magick icon.png -resize 256x256 icon.iconset/icon_128x128@2x.png
magick icon.png -resize 256x256 icon.iconset/icon_256x256.png
magick icon.png -resize 512x512 icon.iconset/icon_256x256@2x.png
magick icon.png -resize 512x512 icon.iconset/icon_512x512.png
magick icon.png -resize 1024x1024 icon.iconset/icon_512x512@2x.png

# Create .icns file
iconutil -c icns icon.iconset

# Clean up
rm -rf icon.iconset

echo "Generated icon.icns for Mac builds!"
