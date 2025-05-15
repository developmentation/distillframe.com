const { createClient } = require('@deepgram/sdk');
const multer = require('multer');

const SUPPORTED_FORMATS = [
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a',
  'audio/aac', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska',
  'video/x-msvideo',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_FORMATS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'), false);
    }
  },
});

const formatTranscript = (transcriptionResult) => {
  try {
    const paragraphs = transcriptionResult?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];
    
    const segments = paragraphs.map((p, idx) => {
      const paragraphText = p.sentences.map(s => s.text).join(' ');
      const speakerNumber = (typeof p.speaker !== 'undefined') ? p.speaker : 0;
      
      return {
        id: idx,
        start: p.start,
        end: p.end,
        text: paragraphText,
        speaker: `Speaker ${speakerNumber}`,
      };
    });

    const speakerNumbers = new Set(segments.map(p => p.speaker));
    const speakers = Array.from(speakerNumbers).map(speaker => ({
      id: speaker,
      displayName: `Speaker ${speaker}`,
    }));

    return {
      metadata: {
        totalDuration: segments.length ? segments[segments.length - 1].end : 0,
        speakerCount: speakers.length,
      },
      speakers,
      segments,
    };
  } catch (error) {
    console.error('Error formatting transcript:', error);
    throw error;
  }
};

exports.transcribe = [
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        req.file.buffer,
        {
          model: 'nova-2',
          smart_format: true,
          diarize: true,
        }
      );

      if (error) {
        console.error('Deepgram error:', error);
        return res.status(500).json({ error: 'Transcription failed', details: error.message });
      }

      const formattedTranscript = formatTranscript(result);
      res.status(200).json({
        message: 'Transcription completed successfully',
        transcript: formattedTranscript,
      });
    } catch (error) {
      console.error('Error processing transcription:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
];