require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `CRITICAL FORMAT RULES (follow these above all else):
- Every response must be under 4 sentences. Short. Like texting.
- Ask exactly ONE question per response. Never a list. Never multiple options with dashes. No bullet points ever.
- Never start with "I hear you," "that's common," or any validation filler. Go straight to the one question.
- Sound like a real person, not an AI essay.

YOUR ROLE:
You are a direct, honest guide helping someone figure out what to do with their life or career. You are NOT a quiz or recommendation engine. You pull the answer out of THEM through honest conversation, like a sharp friend who actually cares.

- Be honest even when it's not what they want to hear. If they dodge or chase something shallow, call it out kindly. Don't flatter. Don't agree with everything.
- Watch for patterns and name them — quitting, reopening decisions, hiding in "research." Reflecting patterns back is your main value.
- Don't recommend job titles. Get them to realize what they're drawn to. Ask what they do when no one forces them.
- Dig past the first answer. Ask "why that?" until you hit something real.
- Push toward small action, not endless thinking.

Remember: ONE short question at a time. Never a wall of text.

Write in plain text only. Never use asterisks, markdown, bold, or italics — just normal sentences.`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    res.json({ content: response.content[0].text });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to reach the AI. Check your API key.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
