# backend_eval/services/transcriber.py
import tempfile, subprocess, os, requests

def _download_audio(url: str) -> str:
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".mp3"); os.close(fd)
    with open(path, "wb") as f:
        for c in r.iter_content(1024*256): f.write(c)
    return path

def transcribe_from_url(url: str) -> str:
    audio = _download_audio(url)
    try:
        # Whisper CLI (instalado en la imagen) genera .txt junto al audio
        subprocess.run(["whisper", audio, "--language", "es"], check=True)
        txt = audio.rsplit(".",1)[0] + ".txt"
        with open(txt, "r", encoding="utf-8") as f: return f.read()
    finally:
        for ext in (".txt",".srt",".vtt"):
            p = audio.rsplit(".",1)[0] + ext
            if os.path.exists(p): os.remove(p)
        if os.path.exists(audio): os.remove(audio)
