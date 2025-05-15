
export function useTranscriptions() {
  const SUPPORTED_EXTENSIONS = [
    '.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac',
    '.mp4', '.mov', '.mkv', '.avi'
  ];

  const validateFile = (file) => {
    const errors = [];
    if (!file) {
      errors.push('No file selected');
      return errors;
    }

    const maxSize = 1000 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      errors.push('File size exceeds 1GB limit');
    }

    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      errors.push('Unsupported file format. Please upload a valid audio or video file');
    }

    return errors;
  };

  const transcribeFile = async (file, onProgress) => {
    const errors = validateFile(file);
    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/transcription', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return {
        success: true,
        data: response.data.transcript,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Transcription failed',
      };
    }
  };

  const updateTranscription = (id, filename, transcript) => {
    // This function can be called to update the media entity in the parent component
    console.log(`Updated transcription for media ${id}:`, transcript);
  };

  return {
    SUPPORTED_EXTENSIONS,
    validateFile,
    transcribeFile,
    updateTranscription,
  };
}