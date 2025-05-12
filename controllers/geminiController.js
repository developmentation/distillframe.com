const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const sharp = require('sharp');

// Helper: Create a Gemini client
const createGeminiClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_API_KEY environment variable.');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Helper: Common safety settings
const getSafetySettings = () => [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Helper: Process a single image prompt
async function processImagePrompt(client, modelName, imageBuffer, systemPrompt, messageHistory) {
  const generativeModel = client.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemPrompt || '',
  });
  const jpgBase64 = imageBuffer.toString('base64');

  const contents = messageHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  contents.push({
    role: 'user',
    parts: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: jpgBase64,
        },
      },
    ],
  });

  const result = await generativeModel.generateContent({
    contents,
    safetySettings: getSafetySettings(),
  });

  const response = await result.response;
  const candidate = response.candidates[0];
  let textContent = '';
  let outputImage = null;

  for (const part of candidate.content.parts) {
    if (part.text) {
      textContent += part.text;
    } else if (part.inlineData) {
      outputImage = part.inlineData.data; // Base64 image, if returned
    }
  }

  const responseData = { text: textContent };
  if (outputImage) {
    const outputBuffer = Buffer.from(outputImage, 'base64');
    const resizedOutput = await sharp(outputBuffer)
      .resize({ width: 640, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    responseData.image = resizedOutput.toString('base64');
  }

  return responseData;
}

// Controller: Handle text-only prompts
exports.geminiTextController = async (req, res) => {
  try {
    const { prompt, model = 'gemini-1.5-flash' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    const client = createGeminiClient();
    const generativeModel = client.getGenerativeModel({ model });

    const result = await generativeModel.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: getSafetySettings(),
    });

    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      data: { text },
    });
  } catch (error) {
    console.error('❌ Gemini Text Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

// Controller: Handle image + prompt inputs (single prompt, kept for compatibility)
exports.geminiImageController = async (req, res) => {
  try {
    const { prompt, imageData, model = 'gemini-1.5-flash' } = req.body;

    if (!prompt || !imageData) {
      return res.status(400).json({
        success: false,
        error: 'Both prompt and imageData (base64) are required.',
      });
    }

    // Validate base64 image
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(imageData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 image format. Must be PNG or JPEG.',
      });
    }

    // Extract base64 data (remove data URI prefix)
    const base64Content = imageData.replace(base64Regex, '');
    let imageBuffer = Buffer.from(base64Content, 'base64');

    // Resize and convert to JPG for consistency
    imageBuffer = await sharp(imageBuffer)
      .resize({ width: 640, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const client = createGeminiClient();
    const responseData = await processImagePrompt(client, model, imageBuffer, prompt, [{ role: 'user', content: prompt }]);

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ Gemini Image Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

// Controller: Handle batch image + prompts (new endpoint)
exports.geminiBatchImageController = async (req, res) => {
  try {
    const { imageData, agentPrompts } = req.body;

    if (!imageData || !Array.isArray(agentPrompts) || agentPrompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'imageData and agentPrompts (array of { agentId, systemPrompt, messageHistory, model }) are required.',
      });
    }

    // Validate base64 image
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(imageData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 image format. Must be PNG or JPEG.',
      });
    }

    // Extract base64 data (remove data URI prefix)
    const base64Content = imageData.replace(base64Regex, '');
    let imageBuffer = Buffer.from(base64Content, 'base64');

    // Convert to JPG for consistency, without resizing
    imageBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const client = createGeminiClient();

    // Process all prompts in parallel
    const analysisPromises = agentPrompts.map(async ({ agentId, systemPrompt, messageHistory, model }) => {
      try {
        const response = await processImagePrompt(client, model || 'gemini-1.5-flash', imageBuffer, systemPrompt, messageHistory);
        return { agentId, response };
      } catch (error) {
        console.error(`❌ Gemini Batch Image Error for agent ${agentId}:`, error);
        return { agentId, response: { error: error.message || 'Internal server error' } };
      }
    });

    const results = await Promise.all(analysisPromises);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('❌ Gemini Batch Image Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};