export function useGeminiApi() {
    async function analyzeFrame(imageData, agentPrompts) {
      try {
        const response = await fetch('/api/gemini/batch-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData,
            agentPrompts, // Array of { agentId, prompt, model }
          }),
        });
  
        const { success, data, error } = await response.json();
        if (!success) {
          throw new Error(error || 'Failed to analyze frame batch');
        }
  
        return data; // Array of { agentId, response: { text, image } }
      } catch (error) {
        console.error('Gemini batch image analysis failed:', error);
        // Retry once
        try {
          const retryResponse = await fetch('/api/gemini/batch-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData,
              agentPrompts,
            }),
          });
  
          const { success, data, error: retryError } = await retryResponse.json();
          if (!success) {
            throw new Error(retryError || 'Retry failed');
          }
  
          return data;
        } catch (retryError) {
          console.error('Gemini batch image retry failed:', retryError);
          throw retryError; // Let the caller handle the error
        }
      }
    }
  
    async function generateText(prompt) {
      try {
        const response = await fetch('/api/gemini/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: 'gemini-1.5-flash',
          }),
        });
  
        const { success, data, error } = await response.json();
        if (!success) {
          throw new Error(error || 'Failed to generate text');
        }
  
        return data.text;
      } catch (error) {
        console.error('Gemini text generation failed:', error);
        // Retry once
        try {
          const retryResponse = await fetch('/api/gemini/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              model: 'gemini-1.5-flash',
            }),
          });
  
          const { success, data, error: retryError } = await retryResponse.json();
          if (!success) {
            throw new Error(retryError || 'Retry failed');
          }
  
          return data.text;
        } catch (retryError) {
          console.error('Gemini text retry failed:', retryError);
          return `Error: ${retryError.message}`;
        }
      }
    }
  
    return {
      analyzeFrame,
      generateText,
    };
  }