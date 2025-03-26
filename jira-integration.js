const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const JIRA_BASE_URL = 'https://libertymutual.atlassian.net';
const PROJECT_KEY = 'EBBP';
const AUTH_HEADER = {
  headers: {
    'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

// Create Epic
async function createEpic(epic) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary: epic.summary,
      description: epic.description,
      issuetype: { name: 'Epic' },
      customfield_10011: epic.summary // ✅ Make sure this matches your Epic Name field
    }
  };
  const res = await axios.post(`${JIRA_BASE_URL}/rest/api/3/issue`, body, AUTH_HEADER);
  return res.data.key;
}

// Create Story
async function createStory(story, epicKey) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary: story.summary,
      description: story.description,
      issuetype: { name: 'Story' },
      customfield_10014: epicKey // ✅ This is the Epic Link field in your Jira
    }
  };
  await axios.post(`${JIRA_BASE_URL}/rest/api/3/issue`, body, AUTH_HEADER);
}

// Route
router.post('/api/jira/create', async (req, res) => {
  const { epic, stories, mock } = req.body;

  try {
    if (mock) {
      console.log('🧪 MOCK MODE ENABLED');
      console.log('Would create epic:', epic.summary);
      stories.forEach((s, i) => console.log(`Would create story ${i + 1}:`, s.summary));
      return res.status(200).json({ message: '✅ Mock: Created successfully', epicKey: 'MOCK-123' });
    }

    const epicKey = await createEpic(epic);
    for (const story of stories) {
      await createStory(story, epicKey);
    }
    res.status(200).json({ message: 'Created in JIRA ✅', epicKey });
  } catch (err) {
    console.error('JIRA creation error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create issues in JIRA' });
  }
});

module.exports = router;
