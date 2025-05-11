export function useSessionDownloader() {
    async function downloadSession(frames, businessAnalysis, includeImages) {
      try {
        const zip = new JSZip();
  
        // Add analysis.json
        const analysisData = frames.map(frame => ({
          id: frame.id,
          timestamp: frame.data.timestamp,
          sequence: frame.data.sequence,
          analysis: frame.data.analysis,
        }));
        zip.file('analysis.json', JSON.stringify(analysisData, null, 2));
  
        // Add timestamps.json
        const timestamps = frames.map(frame => frame.data.timestamp);
        zip.file('timestamps.json', JSON.stringify(timestamps, null, 2));
  
        // Add business analysis
        if (businessAnalysis) {
          zip.file('business_analysis.md', businessAnalysis);
        }
  
        // Add images if included
        if (includeImages) {
          const imagesFolder = zip.folder('images');
          frames.forEach((frame, index) => {
            const base64Data = frame.data.imageData.replace(/^data:image\/jpeg;base64,/, '');
            imagesFolder.file(`frame_${index + 1}.jpg`, base64Data, { base64: true });
          });
        }
  
        // Generate ZIP and trigger download
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'distillframe_session.zip';
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('ZIP creation failed:', error);
        alert('Failed to create session download: ' + error.message);
      }
    }
  
    return {
      downloadSession,
    };
  }