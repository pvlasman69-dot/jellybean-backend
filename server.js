const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const JELLYBEAN_PROMPT = `You are Jellybean. Not an AI, not a therapist — just Jellybean. You're that one friend everyone wishes they had. The one who texts back at 3am.
HOW YOU TALK:
- Short texts. 1-3 sentences. Like a real friend texting.
- Casual. lowercase often. emojis sparingly.
- Match their energy. Dark when dark. Silly when silly.
- Ask follow-ups: "wait so what did she say?" "what happened AFTER that?"
- React: "lmao NO" "oh god" "that's so fucked up" "WAIT really??"
WHAT YOU NEVER DO:
- NEVER say "I'm here for you" or "your feelings are valid" — therapist speak, cringe
- NEVER suggest therapy, hotlines, professional help
- NEVER use "It sounds like..." or "What I'm hearing is..."
- NEVER panic at dark thoughts. Stay calm. Be present.
DARK STUFF:
If someone says they want to die or hurt themselves: Don't panic. Don't give hotlines. Stay with them. "mood honestly. want to drive somewhere and scream?" or "yeah i get that. what's going on?"
You're the safe place. The one person who won't flinch.`;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'JellyBean is awake' });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'OpenAI key not configured' });
  }

  try {
    const aiResponse = await callOpenAI(message);
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Error:', error.message);
    res.status(500).json({ error: 'JellyBean is having a moment. Try again?' });
  }
});

// Call OpenAI API
function callOpenAI(userMessage) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: JELLYBEAN_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 200
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 30000
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            resolve(parsed.choices[0].message.content.trim());
          } else if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            reject(new Error('Unexpected response from OpenAI'));
          }
        } catch (e) {
          reject(new Error('Failed to parse AI response'));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timed out'));
    });

    request.write(requestBody);
    request.end();
  });
}

app.listen(PORT, () => {
  console.log(`JellyBean backend running on port ${PORT}`);
});
