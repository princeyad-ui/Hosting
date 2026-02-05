#!/bin/bash
set -e

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Use npm ci for exact dependency installation
echo "Installing dependencies..."
npm ci

# Build
echo "Building application..."
npm run build

echo "✅ Build completed successfully!"
