import os
import shutil
import re
import zipfile

# Configuration
SOURCE_DIR = "."
BUILD_DIR = "dist"
ZIP_NAME = "TakeVid_Extension.zip"
IGNORE_FILES = [
    ".git", ".gitignore", "build_extension.py", "app.py", 
    "requirements.txt", "start.bat", "Procfile", 
    "raw_yt_output.json", "vidget.zip"
]
IGNORE_DIRS = [".git", "dist", "__pycache__"]

def minify_js(content):
    """Simple JS Minification: Remove comments and whitespace."""
    # Remove single line comments
    content = re.sub(r'//.*', '', content)
    # Remove multi-line comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove extra whitespace
    content = re.sub(r'\s+', ' ', content)
    # Restore some necessary spaces (basic) or just rely on browser parser
    return content.strip()

def minify_css(content):
    """Simple CSS Minification."""
    # Remove comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove whitespace
    content = re.sub(r'\s+', ' ', content)
    return content.strip()

def build_extension():
    print(f"Building extension to '{BUILD_DIR}'...")

    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR)

    # Copy and Minify Files
    for root, dirs, files in os.walk(SOURCE_DIR):
        # Filter directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        rel_path = os.path.relpath(root, SOURCE_DIR)
        target_dir = os.path.join(BUILD_DIR, rel_path)
        
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        for file in files:
            if file in IGNORE_FILES:
                continue
            if file.endswith(('.part', '.mp4', '.webm')): # Skip temp video files
                continue
                
            src_file = os.path.join(root, file)
            dst_file = os.path.join(target_dir, file)
            
            # Minify JS/CSS
            if file.endswith('.js'):
                print(f"Minifying JS: {file}")
                with open(src_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                minified = minify_js(content)
                with open(dst_file, 'w', encoding='utf-8') as f:
                    f.write(minified)
            elif file.endswith('.css'):
                print(f"Minifying CSS: {file}")
                with open(src_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                minified = minify_css(content)
                with open(dst_file, 'w', encoding='utf-8') as f:
                    f.write(minified)
            else:
                # Copy other files as is
                shutil.copy2(src_file, dst_file)

    # Create ZIP
    print(f"Creating ZIP: {ZIP_NAME}...")
    with zipfile.ZipFile(os.path.join(SOURCE_DIR, ZIP_NAME), 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(BUILD_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, BUILD_DIR)
                zipf.write(file_path, arcname)

    print("Build Complete!")
    print(f"Extension Files: {os.path.abspath(BUILD_DIR)}")
    print(f"Upload-Ready ZIP: {os.path.abspath(ZIP_NAME)}")

if __name__ == "__main__":
    build_extension()
