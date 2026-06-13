const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

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

app.get('/', (req, res) => {
  res.json({ status: 'JellyBean is awake' });
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ response: "My brain's having a moment. Can you try again? 🙃" });
  if (!GEMINI_KEY) return res.json({ response: "My brain's having a moment. Can you try again? 🙃" });

  try {
    const aiResponse = await callGemini(message);
    if (!aiResponse || aiResponse.trim().length === 0) {
      return res.json({ response: "My brain's having a moment. Can you try again? 🙃" });
    }
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Gemini Error:', error.message);
    res.json({ response: "My brain's having a moment. Can you try again? 🙃" });
  }
});

function callGemini(userMessage) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${JELLYBEAN_PROMPT}\n\nUser: ${userMessage}\nJellyBean:`;
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 200 }
    });

    const path = `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 30000
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts) {
            const text = parsed.candidates[0].content.parts[0].text.trim();
            if (text && text.length > 0) resolve(text);
            else reject(new Error('Empty response'));
          } else if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            reject(new Error('Unexpected response'));
          }
        } catch (e) {
          reject(new Error('Failed to parse'));
        }
      });
    });

    request.on('error', (error) => reject(error));
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
    request.write(requestBody);
    request.end();
  });
}

app.listen(PORT, () => {
  console.log(`JellyBean backend running on port ${PORT}`);
});
