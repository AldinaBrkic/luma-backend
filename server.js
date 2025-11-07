const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Root ruta za test (da prestane 404)
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
    // 1. Pokreni generisanje
    let loudlyRes = await fetch('https://api.loudly.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ style })
    });

    let loudlyData = await loudlyRes.json();
    console.log('Initial generate response:', loudlyData);

    if (!loudlyData.task_id) {
      return res.status(502).json({ message: 'Failed to start generation. Check API key.' });
    }

    const taskId = loudlyData.task_id;

    // 2. Polling za status (Loudly je asinhron)
    let audioUrl = null;
    const maxAttempts = 20; // ~60s
    for (let i = 0; i < maxAttempts; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3s između
        loudlyRes = await fetch(`https://api.loudly.com/v1/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        loudlyData = await loudlyRes.json();
      }
      console.log(`Polling ${i + 1}:`, loudlyData);

      if (loudlyData.status === 'completed' && loudlyData.audio_url) {
        audioUrl = loudlyData.audio_url;
        break;
      }
      if (loudlyData.status === 'failed') {
        return res.status(502).json({ message: 'Generation failed on Loudly.' });
      }
    }

    if (!audioUrl) {
      return res.status(408).json({ message: 'Timeout: Music generation took too long.' });
    }

    // 3. Vrati rezultat
    res.json({
      message: `Generated ${style} music for ${emotion}`,
      style,
      description,
      audio_url: audioUrl
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error. Check logs.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Luma backend running on port ${PORT}`);
});