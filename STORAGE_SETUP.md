# Supabase Storage Setup Instructions

## Storage Buckets Configuration

After running the migration, you need to create the storage buckets in your Supabase dashboard:

### 1. Create Storage Buckets

Go to your Supabase dashboard → Storage and create two buckets:

1. **audio-files**

   - Name: `audio-files`
   - Public: Yes
   - File size limit: 50MB
   - Allowed MIME types: `audio/mp3, audio/mpeg, audio/wav, audio/flac`

2. **cover-images**
   - Name: `cover-images`
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

### 2. Storage Policies

The migration automatically creates the necessary RLS policies for storage:

- **Audio Files:**

  - Users can upload audio files
  - All audio files are publicly readable
  - Users can only delete their own files

- **Cover Images:**
  - Users can upload cover images
  - All cover images are publicly readable
  - Users can only delete their own files

### 3. Database Schema

The migration creates:

- `tracks` table with all necessary columns
- Proper indexes for performance
- RLS policies for data security
- Triggers for automatic timestamp updates

### 4. Testing the Upload Feature

1. Make sure you're authenticated in the app
2. Go to the Upload Modal
3. Select an audio file (MP3, WAV, FLAC up to 50MB)
4. Optionally select a cover image (JPG, PNG at least 640x640px)
5. Fill in track details (title is required)
6. Upload and watch the progress indicator

### 5. File Organization

Files are organized in storage as:

```
audio-files/
  audio/
    {userId}_{timestamp}.{extension}

cover-images/
  covers/
    {userId}_{timestamp}.{extension}
```

This ensures each user's files are properly organized and conflicts are avoided.
