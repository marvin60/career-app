require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !!process.env.BASE_URL,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
}, (accessToken, refreshToken, profile, done) => {
  done(null, {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails[0]?.value,
    photo: profile.photos[0]?.value,
  });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

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

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

app.get('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

app.get('/api/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ name: req.user.name, email: req.user.email, photo: req.user.photo });
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

app.post('/api/chat', requireAuth, async (req, res) => {
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

const REFLECT_PROMPT = `You are reading a conversation between a person and a career guide. Your job is to write a short, honest reflection of the patterns you noticed — like a sharp friend who paid close attention.

RULES:
- 3–5 sentences max. No more.
- Be specific, not generic. Name what you actually saw in this conversation.
- No flattery. No "you're so self-aware." Say what's real.
- Point out what they seem drawn to AND what seems to be holding them back.
- If they dodged something, name it. If they kept circling the same thing, name it.
- Write in second person ("you"). Plain sentences. No bullet points, no markdown.
- This should feel like what a perceptive friend would say, not a therapist's report.`;

app.post('/api/reflect', requireAuth, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length < 2) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: REFLECT_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Based on the conversation below, write your honest reflection of the patterns you noticed.\n\n' +
            messages.map(m => `${m.role === 'user' ? 'Person' : 'Guide'}: ${m.content}`).join('\n'),
        },
      ],
    });

    res.json({ content: response.content[0].text });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to generate reflection.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
