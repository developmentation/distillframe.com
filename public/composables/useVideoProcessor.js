export function useVideoProcessor() {
    function extractFrame(videoElement, timestamp) {
      return new Promise((resolve, reject) => {
        try {
          // Ensure video is at the correct time
          videoElement.currentTime = timestamp;
  
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const ctx = canvas.getContext('2d');
  
          // Draw video frame on canvas
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
          // Convert to base64 JPEG
          const imageData = canvas.toDataURL('image/jpeg', 0.7);
          resolve(imageData);
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