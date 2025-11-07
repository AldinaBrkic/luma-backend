const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
    const loudlyRes = await fetch('https://api.loudly.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ style })
    });

    const loudlyData = await loudlyRes.json();

    if (!loudlyData.audio_url) {
      throw new Error('No audio URL returned from Loudly.');
    }

    res.json({
      message: `Generated ${style} music for ${emotion}`,
      style,
      description,
      audio_url: loudlyData.audio_url
    });
  } catch (error) {
    console.error('Loudly API error:', error);
    res.status(500).json({ message: 'Error generating music.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Luma backend running on port ${PORT}`);
});
