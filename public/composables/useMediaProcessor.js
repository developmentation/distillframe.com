export function useMediaProcessor() {
    function extractFrame(element, timestamp, mediaType) {
      return new Promise((resolve, reject) => {
        try {
          if (mediaType === 'video') {
            // Ensure video is at the correct time
            element.currentTime = timestamp;
  
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = element.videoWidth;
            canvas.height = element.videoHeight;
            const ctx = canvas.getContext('2d');
  
            // Draw video frame on canvas
            ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
  
            // Convert to base64 JPEG
            const imageData = canvas.toDataURL('image/jpeg', 1);
            resolve(imageData);
          } else if (mediaType === 'image') {
            // For images, return the existing image data
            const canvas = document.createElement('canvas');
            canvas.width = element.naturalWidth;
            canvas.height = element.naturalHeight;
            const ctx = canvas.getContext('2d');
  
            // Draw image on canvas
            ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
  
            // Convert to base64 JPEG
            const imageData = canvas.toDataURL('image/jpeg', 1);
            resolve(imageData);
          } else {
            throw new Error('Unsupported media type');
          }
        } catch (error) {
          console.error('Frame extraction failed:', error);
          resolve('/assets/placeholder.jpg'); // Fallback image
        }
      });
    }
  
    return {
      extractFrame,
    };
}