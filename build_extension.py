#!/usr/bin/env python3
"""
Build script for TakeVid extension
Creates a clean distribution zip file ready for Chrome Web Store submission
"""

import os
import zipfile
import json
from pathlib import Path

# Files to include in the extension build
INCLUDE_FILES = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'popup.css',
    'background.js',
    'privacy-notice.html',
    'options.html',
    'options.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
]

# Files to exclude (not needed in extension)
EXCLUDE_PATTERNS = [
    '__pycache__',
    '.git',
    '.env',
    'app.py',
    'requirements.txt',
    'Dockerfile',
    'Procfile',
    'build_extension.py',
    '.gitignore',
    'README.md',
    'CHANGELOG.md',
    'PRIVACY_POLICY.md',
    '.env.example',
    'dist/'
]

def create_extension_zip():
    """Create a clean zip file for Chrome Web Store submission."""
    
    # Read version from manifest
    with open('manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        version = manifest['version']
    
    output_filename = f"takevid-extension-v{version}.zip"
    output_path = Path('dist') / output_filename
    
    # Create dist directory if it doesn't exist
    Path('dist').mkdir(exist_ok=True)
    
    # Remove old zip if exists
    if output_path.exists():
        output_path.unlink()
        print(f"Removed old build: {output_path}")
    
    # Create zip file
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in INCLUDE_FILES:
            if Path(file).exists():
                zipf.write(file)
                print(f"✓ Added: {file}")
            else:
                print(f"⚠ Warning: {file} not found, skipping")
    
    file_size = output_path.stat().st_size / 1024  # KB
    print(f"\n✅ Build complete!")
    print(f"📦 Output: {output_path}")
    print(f"📏 Size: {file_size:.1f} KB")
    print(f"\nReady for Chrome Web Store submission!")
    
    return output_path

if __name__ == '__main__':
    create_extension_zip()
