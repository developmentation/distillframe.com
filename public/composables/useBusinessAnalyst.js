import { useGeminiApi } from './useGeminiApi.js';

export function useBusinessAnalyst() {
  const { generateText } = useGeminiApi();

  async function generateAnalysis(frames) {
    try {
      const analysisData = frames.map(frame => frame.data.analysis);
      const prompt = `
Given an array of frame analysis JSONs, generate a comprehensive business analysis in Markdown. Include insights, trends, and recommendations based on descriptions, structured data, and knowledge graphs.

Frame Analysis Data:
${JSON.stringify(analysisData, null, 2)}
      `;

      const markdown = await generateText(prompt);
      return markdown;
    } catch (error) {
      console.error('Business analysis generation failed:', error);
      return `Error: Unable to generate business analysis - ${error.message}`;
    }
  }

  return {
    generateAnalysis,
  };
}