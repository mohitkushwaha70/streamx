# Hugging Face Video Upload Guide

## Step 1: Space Banao

1. https://huggingface.co/new-space pe jao
2. Fill karo:
   - **Space name**: `streamx-videos` (ya koi bhi naam)
   - **License**: Choose any (MIT ya Apache 2.0)
   - **SDK**: **Static** select karo
   - **Visibility**: **Private** rakho (sirf tum access kar sako)
3. **Create Space** pe click karo

## Step 2: Videos Upload Karo

### Method A: Web UI (Easy - 1-5 videos)
1. Space kholo → **Files** tab pe jao
2. **Upload files** button pe click karo
3. Apni video files select karo (.mp4 preferred)
4. Upload hone do

### Method B: Git CLI (Better for 20+ videos)

```bash
# Pehle HF CLI install karo
pip install huggingface_hub

# Login karo
huggingface-cli login

# Clone your space
git clone https://huggingface.co/spaces/YOUR_USERNAME/streamx-videos
cd streamx-videos

# Videos ko organize karo (folders banao)
mkdir -p movies series

# Copy videos
cp /path/to/movie1.mp4 movies/
cp /path/to/movie2.mp4 movies/

# Upload
git add .
git commit -m "add videos"
git push
```

### Method C: HF API se Direct Upload (Sabse Fast)

```bash
# Install
pip install huggingface_hub

# Upload single file
huggingface-cli upload YOUR_USERNAME/streamx-videos ./movie.mp4 movies/movie.mp4

# Upload folder
huggingface-cli upload YOUR_USERNAME/streamx-videos ./my_videos/ movies/ --repo-type space
```

## Step 3: Direct URLs Ka Format

Jab videos upload ho jayein, direct URL aisa hoga:

```
https://YOUR_USERNAME-streamx-videos.hf.space/files/movies/movie1.mp4
```

Ya agar Space Static hai to:

```
https://YOUR_USERNAME-streamx-videos.hf.space/movies/movie1.mp4
```

## Step 4: App me Configure Karo

`data/videos.json` file me videos map karo:

```json
{
  "1339713": {
    "title": "Obsession",
    "sources": {
      "1080p": "https://YOUR_USERNAME-streamx-videos.hf.space/files/movies/obsession-1080p.mp4",
      "720p": "https://YOUR_USERNAME-streamx-videos.hf.space/files/movies/obsession-720p.mp4"
    }
  }
}
```

## Step 5: Render pe Env Var Set Karo

Render Dashboard → Environment → Naya variable:

```
KEY: VIDEO_STORAGE_BASE
VALUE: https://YOUR_USERNAME-streamx-videos.hf.space/files
```
