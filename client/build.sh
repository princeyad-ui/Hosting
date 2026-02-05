#!/bin/bash
set -e

# Clear all caches
echo "Clearing npm cache..."
npm cache clean --force

# Remove old lockfile and node_modules
echo "Removing old dependencies..."
rm -rf node_modules package-lock.json

# Fresh install
echo "Installing fresh dependencies..."
npm install

# Build
echo "Building application..."
npm run build

echo "✅ Build completed successfully!"
