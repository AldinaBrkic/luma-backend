const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
app.use(cors()); // Dozvoli sve (uklj. Vercel)
app.use(express.json());

// Test ruta
app.get('/', (req, res) => {
  res.json({ message: 'Luma Backend is running! Use POST /generate with { emotion: "joy" }' });
});

const emotionToStyle = {
  joy: 'lo-fi',
  calm: 'ambient',
  sadness: 'piano',
  anger: 'techno'
};

const styleDescriptions = {
  'lo-fi': 'Relaxed and nostalgic beats perfect for joyful moods.',
  ambient: 'Smooth atmospheric textures for calming emotions.',
  piano: 'Gentle melodies that reflect introspective sadness.',
  techno: 'Energetic and pulsing rhythms for intense emotions.'
};

app.post('/generate', async (req, res) => {
  const { emotion } = req.body;
  if (!emotion || !emotionToStyle[emotion.toLowerCase()]) {
    return res.status(400).json({ message: 'Invalid or missing emotion.' });
  }

  const style = emotionToStyle[emotion.toLowerCase()];
  const description = styleDescriptions[style];
  const apiKey = process.env.LOUDLY_API_KEY;

  try {
    // 1. Pokreni generiranje
    const generateRes = await fetch('https://api.loudly.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ style })
    });

    const data = await generateRes.json();

    if (!data.task_id) {
      return res.status(502).json({ message: 'Failed to start generation.' });
    }

    const taskId = data.task_id;

    // 2. Polling
    let audioUrl = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.loudly.com/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const statusData = await statusRes.json();

      if (statusData.status === 'completed' && statusData.audio_url) {
        audioUrl = statusData.audio_url;
        break;
      }
      if (statusData.status === 'failed') {
        return res.status(502).json({ message: 'Generation failed.' });
      }
    }

    if (!audioUrl) {
      return res.status(408).json({ message: 'Timeout.' });
    }

    // 3. Vrati
    res.json({
      message: `Generated ${style} music for ${emotion}`,
      style,
      description,
      audio_url: audioUrl
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});