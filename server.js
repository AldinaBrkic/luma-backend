// server.js – ISPRAVLJENO ZA Node.js 18+ (Render)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// NEMA node-fetch – koristi ugrađeni fetch
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Luma Backend is running!' });
});

const emotionToStyle = { /* ... */ };
const styleDescriptions = { /* ... */ };

app.post('/generate', async (req, res) => {
  const { emotion } = req.body;
  if (!emotion || !emotionToStyle[emotion.toLowerCase()]) {
    return res.status(400).json({ message: 'Invalid emotion.' });
  }

  const style = emotionToStyle[emotion.toLowerCase()];
  const description = styleDescriptions[style];
  const apiKey = process.env.LOUDLY_API_KEY;

  try {
    // 1. Pokreni generiranje – koristi globalni fetch
    const generateRes = await fetch('https://api.loudly.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ style })
    });

    if (!generateRes.ok) {
      const err = await generateRes.text();
      console.error('Loudly error:', err);
      return res.status(502).json({ message: 'Loudly API error' });
    }

    const data = await generateRes.json();
    if (!data.task_id) {
      return res.status(502).json({ message: 'No task_id from Loudly' });
    }

    const taskId = data.task_id;

    // 2. Polling
    let audioUrl = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`https://api.loudly.com/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!statusRes.ok) continue;

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

    res.json({
      message: `Generated ${style} music`,
      style,
      description,
      audio_url: audioUrl
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend on port ${PORT}`);
});