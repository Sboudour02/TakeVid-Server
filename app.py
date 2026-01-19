from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import yt_dlp
import io
import os
import time
import subprocess
import json
import tempfile
import atexit

import shutil

app = Flask(__name__)
CORS(app)

# --- Configuration ---
# Check for yt-dlp in PATH, otherwise use default 'yt-dlp' command which assumes it's in the system PATH
YT_DLP_PATH = shutil.which('yt-dlp') or 'yt-dlp'

def check_yt_dlp():
    """Verify that yt-dlp is accessible."""
    try:
        # Check version
        result = subprocess.run([YT_DLP_PATH, '--version'], capture_output=True, text=True, check=True)
        print(f"yt-dlp version verified: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"CRITICAL: yt-dlp not found or error executing. Path: {YT_DLP_PATH}. Error: {e}")
        return False

check_yt_dlp()

def _create_cookie_file(cookies):
    """Creates a Netscape-formatted cookie file from a list of cookie objects."""
    if not cookies:
        return None
    
    # Use system temp directory for better cross-platform support
    fd, path = tempfile.mkstemp(suffix='.txt', text=True)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write("# Netscape HTTP Cookie File\n")
        for cookie in cookies:
            try:
                domain = cookie.get('domain', '')
                initial_dot = domain.startswith('.')
                flag = 'TRUE' if initial_dot else 'FALSE'
                path_val = cookie.get('path', '/')
                secure = 'TRUE' if cookie.get('secure') else 'FALSE'
                expires = str(int(cookie.get('expirationDate', 0))) if cookie.get('expirationDate') else '0'
                name = cookie.get('name', '')
                value = cookie.get('value', '')
                
                # Basic Netscape format: domain, flag, path, secure, expiration, name, value
                f.write(f"{domain}\t{flag}\t{path_val}\t{secure}\t{expires}\t{name}\t{value}\n")
            except Exception as e:
                print(f"Skipping cookie due to error: {e}")
                continue
    return path

@app.route('/')
def home():
    yt_version = "Unknown"
    try:
        result = subprocess.run([YT_DLP_PATH, '--version'], capture_output=True, text=True)
        yt_version = result.stdout.strip()
    except Exception as e:
        yt_version = f"Error: {e}"
    
    return jsonify({
        'status': 'running',
        'yt_dlp_path': YT_DLP_PATH,
        'yt_dlp_version': yt_version
    })

def get_video_info(url, cookie_path=None, user_agent=None):
    """Fallback to CLI for robust extraction if library fails to see all formats"""
    try:
        cmd = [
            YT_DLP_PATH, 
            '--no-playlist', 
            '--dump-json', 
            '--no-check-certificate',
            '--no-warnings',
            '--prefer-free-formats',
            '--geo-bypass',
            '--add-header', 'Referer:https://www.tiktok.com/',
            '--add-header', 'Origin:https://www.tiktok.com/',
            url
        ]
        
        if cookie_path:
             cmd.extend(['--cookies', cookie_path])

        # Use provided user agent or fallback to a common one
        ua = user_agent or 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        cmd.extend(['--user-agent', ua])

        # Added 30 second timeout for metadata extraction
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, encoding='utf-8', timeout=30)
        
        # Debug: Save output
        with open('raw_yt_output.json', 'w', encoding='utf-8') as f_debug:
            f_debug.write(result.stdout)
            
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        print(f"Timeout Error: yt-dlp took too long to analyze {url}")
        return {'error': 'Analysis timed out. Try again.'}
    except subprocess.CalledProcessError as e:
        print(f"CLI Error: {e.stderr}")
        return {'error': f"Extractor Error: {e.stderr}"}
    except Exception as e:
        print(f"CLI Extraction Error: {e}")
        return {'error': f"System Error: {str(e)}"}

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    url = data.get('url')
    cookies_list = data.get('cookies')
    user_agent = data.get('userAgent')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    cookie_path = _create_cookie_file(cookies_list)

    try:
        info = get_video_info(url, cookie_path, user_agent)
    finally:
        if cookie_path and os.path.exists(cookie_path):
            try:
                os.remove(cookie_path)
            except:
                pass

    if not info:
        return jsonify({'error': 'Could not extract video info (Unknown Error)'}), 500
        
    if 'error' in info:
         return jsonify({'error': info['error']}), 500

    formats_list = info.get('formats', [])
    processed_formats = {}
    target_resolutions = ['2160p', '1440p', '1080p', '720p', '480p', '360p'] # Prioritize high q
    
    for f in formats_list:
        if f.get('vcodec') == 'none': continue
        
        height = f.get('height')
        width = f.get('width')
        
        # Use simple integer height check first
        if height:
            # Check for vertical video (TikTok/Shorts)
            # If vertical, use width to determine "class" (e.g. 1080x1920 is 1080p class, not 1440p+)
            compare_dim = height
            is_vertical = False
            if width and height > width:
                compare_dim = width
                is_vertical = True
            
            if compare_dim >= 2160: res = '2160p'
            elif compare_dim >= 1440: res = '1440p'
            elif compare_dim >= 1080: res = '1080p'
            elif compare_dim >= 720: res = '720p'
            elif compare_dim >= 480: res = '480p'
            elif compare_dim >= 360: res = '360p'
            else: res = 'low'
        else:
             continue # Skip unknown heights for now

        if res in target_resolutions:
            size = f.get('filesize') or f.get('filesize_approx') or 0
            ext = f.get('ext')
            
            # Prioritize mp4 and larger file sizes (better bitrate usually)
            if res not in processed_formats:
                processed_formats[res] = {
                    'resolution': res,
                    'size': size,
                    'format_id': f['format_id'],
                    'ext': ext,
                    'height': height,
                    'is_vertical': is_vertical
                }
            else:
                curr_val = processed_formats[res]
                # If current match isn't MP4 but new one is, take new one
                if curr_val['ext'] != 'mp4' and ext == 'mp4':
                     processed_formats[res] = {
                        'resolution': res,
                        'size': size,
                        'format_id': f['format_id'],
                        'ext': ext,
                        'height': height,
                        'is_vertical': is_vertical
                    }
                # If same ext, start comparing sizes
                elif curr_val['ext'] == ext and size > curr_val['size']:
                    processed_formats[res] = {
                        'resolution': res,
                        'size': size,
                        'format_id': f['format_id'],
                        'ext': ext,
                        'height': height,
                        'is_vertical': is_vertical
                    }

    # Audio size estimation
    audio_size = 0
    for f in formats_list:
        if f.get('vcodec') == 'none' and f.get('acodec') != 'none':
             s = f.get('filesize') or f.get('filesize_approx') or 0
             if s > audio_size:
                 audio_size = s

    final_formats = []
    # Force order
    for res in target_resolutions:
        if res in processed_formats:
            fmt = processed_formats[res]
            total_size = fmt['size'] + audio_size 
            
            display_quality = res
            if fmt.get('is_vertical'):
                display_quality += ' (Vertical)'
            
            final_formats.append({
                'id': fmt['format_id'],
                'type': 'video',
                'quality': display_quality,
                'height': fmt['height'],
                'size_bytes': total_size,
                'size_text': f"{total_size / (1024*1024):.1f} MB" if total_size > 0 else "Estimate"
            })
    
    final_formats.append({
        'id': 'bestaudio',
        'type': 'audio',
        'quality': '128kbps',
        'size_bytes': audio_size,
        'size_text': f"{audio_size / (1024*1024):.1f} MB" if audio_size > 0 else "Estimate"
    })

    return jsonify({
        'title': info.get('title'),
        'thumbnail': info.get('thumbnail'),
        'duration': info.get('duration'),
        'webpage_url': info.get('webpage_url'),
        'uploader': info.get('uploader'),
        'formats': final_formats
    })


import uuid

# Memory cache for download requests: token -> data
download_requests = {}

@app.route('/prepare_download', methods=['POST'])
def prepare_download():
    """Stores download parameters and returns a token for GET access."""
    try:
        data = request.json
        if not data or not data.get('url'):
            return jsonify({'error': 'No URL provided'}), 400
            
        token = str(uuid.uuid4())
        download_requests[token] = {
            'url': data.get('url'),
            'format': data.get('format'),
            'quality': data.get('quality'),
            'format_id': data.get('format_id'),
            'cookies': data.get('cookies'),
            'timestamp': time.time()
        }
        
        # Cleanup old tokens (simple garbage collection)
        current_time = time.time()
        to_delete = [k for k, v in download_requests.items() if current_time - v['timestamp'] > 300] # 5 min TTL
        for k in to_delete:
            del download_requests[k]
            
        return jsonify({'token': token})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/trigger_download/<token>', methods=['GET'])
def trigger_download(token):
    """Executes the download using stored parameters."""
    req_data = download_requests.get(token)
    if not req_data:
        return jsonify({'error': 'Invalid or expired download token'}), 404
        
    # Remove token to prevent reuse (optional, but good for cleanup)
    # del download_requests[token] 

    url = req_data.get('url')
    fmt_type = req_data.get('format')
    quality = req_data.get('quality')
    format_id = req_data.get('format_id')
    cookies_list = req_data.get('cookies')

    print(f"DEBUG: Triggering download for token {token}. URL={url}")

    cookie_path = _create_cookie_file(cookies_list)
    
    # Use discovered path
    yt_dlp_exe = YT_DLP_PATH

    if fmt_type == 'audio':
        format_str = 'bestaudio/best'
    elif format_id:
         format_str = f'{format_id}+bestaudio/best'
    elif quality:
        targets = [144, 240, 360, 480, 720, 1080, 1440, 2160]
        q_clean = str(quality).replace('p', '')
        if q_clean.isdigit() and int(q_clean) in targets:
            format_str = f'bestvideo[height={q_clean}]+bestaudio/bestvideo[height<={q_clean}]+bestaudio/best'
        else:
            format_str = f'{quality}+bestaudio/best'
    else:
        format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'

    timestamp = int(time.time())
    temp_filename = f"temp_{timestamp}" # base name
    
    cmd = [
        yt_dlp_exe,
        '--no-playlist',
        '--format', format_str,
        '--merge-output-format', 'mp4',
        '-o', f'{temp_filename}.%(ext)s',
        '--no-warnings',
        '--no-check-certificate',
        '--prefer-free-formats',
        url
    ]
    
    if cookie_path:
        cmd.extend(['--cookies', cookie_path])
        
    if fmt_type == 'audio':
        cmd.extend(['-x', '--audio-format', 'mp3'])
    
    # Add headers to avoid bot detection
    cmd.extend(['--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'])

    try:
        # Run download via subprocess - 5 minute timeout for download
        subprocess.run(cmd, check=True, capture_output=True, text=True, encoding='utf-8', timeout=300)
        
        # Find the file that was created
        downloaded_file = None
        for file in os.listdir('.'):
            if file.startswith(temp_filename):
                downloaded_file = file
                break
        
        if not downloaded_file:
             return jsonify({'error': 'Download failed - no file created'}), 500

        # Create return filename
        return_filename = f"video_{timestamp}.{'mp3' if fmt_type == 'audio' else 'mp4'}"
        
        # We need to read the file into memory to stream it if we delete it immediately, 
        # OR we can use send_file with a callback (harder in Flask standard)
        # OR just read to BytesIO as before
        with open(downloaded_file, 'rb') as f:
            file_data = io.BytesIO(f.read())

        # Cleanup
        try: os.remove(downloaded_file)
        except: pass
        if cookie_path and os.path.exists(cookie_path):
            try: os.remove(cookie_path)
            except: pass

        return send_file(
            file_data,
            as_attachment=True,
            download_name=return_filename,
            mimetype='audio/mpeg' if fmt_type == 'audio' else 'video/mp4'
        )

    except subprocess.CalledProcessError as e:
        print(f"Download Error: {e.stderr}")
        if cookie_path and os.path.exists(cookie_path):
            try: os.remove(cookie_path)
            except: pass
        return jsonify({'error': f"Download backend failed: {e.stderr}"}), 500
    except Exception as e:
        print(f"Generic Error: {str(e)}")
        if cookie_path and os.path.exists(cookie_path):
            try: os.remove(cookie_path)
            except: pass
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
