# Cached Photos Directory

This directory stores temporary photos and images from the soil monitoring system.

## Features:
- Automatic photo caching from sensors
- Dropbox upload integration
- Automatic cleanup of old files

## Usage:
- Photos are automatically saved here when captured
- Use `npm run clean-cache` to clear old photos
- Dropbox integration uploads photos to cloud storage

## File Types:
- `.jpg`, `.png` - Soil condition photos
- `.json` - Photo metadata
- `.log` - Upload logs

**Note**: This directory is automatically created by the setup script.