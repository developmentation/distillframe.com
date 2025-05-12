export function useGeminiApi() {
    async function analyzeFrame(imageData, agentPrompts) {
      try {
        const response = await fetch('/api/gemini/batch-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData,
            agentPrompts,
          }),
        });

        const { success, data, error } = await response.json();
        if (!success) {
          throw new Error(error || 'Failed to analyze frame batch');
        }

        return data;
      } catch (error) {
        console.error('Gemini batch image analysis failed:', error);
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
          throw retryError;
        }
      }
    }

    async function generateText(promptData) {
      try {
        let payload;
        let model;

        if (typeof promptData === 'string') {
          // Handle legacy string prompt
          payload = { prompt: promptData, model: 'gemini-1.5-flash' };
          model = 'gemini-1.5-flash';
        } else {
          // Handle new object payload
          const { systemPrompt, messageHistory, model: specifiedModel } = promptData;
          model = specifiedModel || 'gemini-1.5-flash';
          payload = {
            systemPrompt: systemPrompt || '',
            messageHistory: messageHistory || [],
            model,
          };
        }

        console.log('generateText PAYLOAD:', payload);

        const response = await fetch('/api/gemini/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const { success, data, error } = await response.json();
        if (!success) {
          throw new Error(error || 'Failed to generate text');
        }

        return data.text;
      } catch (error) {
        console.error('Gemini text generation failed:', error);
        try {
          const retryResponse = await fetch('/api/gemini/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promptData),
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