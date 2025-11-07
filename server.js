const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/generate', (req, res) => {
  const { emotion } = req.body;

  const styles = {
    calm: 'ambient',
    joy: 'lo-fi',
    sadness: 'piano',
    anger: 'techno'
  };

  const descriptions = {
    calm: 'Your thoughts drift in ambient silence.',
    joy: 'Joy dances to the rhythm of lo-fi beats.',
    sadness: 'The piano whispers your quiet thoughts.',
    anger: 'Techno pulses like your inner storm.'
  };

  const style = styles[emotion.toLowerCase()] || 'experimental';
  const description = descriptions[emotion.toLowerCase()] || 'Experimental tones seek your emotion.';
  const response = `Luma feels your emotion: ${emotion}`;

  res.json({ message: response, style, description }); // ✅ description is now included
});

app.listen(3001, () => {
  console.log('Luma backend is running at http://localhost:3001');
});
