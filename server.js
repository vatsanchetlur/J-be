const express = require('express');
const cors = require('cors');
const app = express();
const prompts = require('./data/prompts.json'); // Ensure this file exists

require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ CORS - Only allow frontend GitHub Pages domain
app.use(cors({
  origin: 'https://vatsanchetlur.github.io',
}));

app.use(express.json());

// ✅ Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route working! ✅' });
});

// ✅ Prompt Library route
app.get('/api/prompts', (req, res) => {
  res.json(prompts);
});

// ✅ Helper: Validate GPT response format
function isValidAgileResponse(data) {
  if (!data.epic || !data.epic.summary || !data.epic.description) return false;
  if (!Array.isArray(data.stories)) return false;

  for (const story of data.stories) {
    if (!story.summary || !story.description) return false;
    if (story.acceptanceCriteria && !Array.isArray(story.acceptanceCriteria)) return false;
    if (story.tasks && !Array.isArray(story.tasks)) return false;
  }

  return true;
}

// ✅ Main GPT endpoint
app.post('/api/generate-upload', async (req, res) => {
  const { persona, edge, projectKey, jiraUser, jiraLabel, prompt } = req.body;

  if (!persona || !edge || !projectKey || !jiraUser || !jiraLabel || !prompt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful product owner writing Agile EPICs and user stories.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse GPT response:', text);
      return res.status(500).json({ error: 'Failed to parse GPT response. Response:\n' + text });
    }

    if (!isValidAgileResponse(json)) {
      console.error('Invalid GPT response format:', json);
      return res.status(500).json({ error: 'GPT returned invalid structure. Try rephrasing your prompt.' });
    }

    res.status(200).json(json);
  } catch (err) {
    console.error('GPT API Error:', err);
    res.status(500).json({ error: 'Error generating GPT response' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
