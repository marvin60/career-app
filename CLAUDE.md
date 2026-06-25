# Career App

A career-guidance web app where users have a conversation with an AI to work through career questions. Built with Node.js and Express, using the Anthropic API.

## Structure

- `server.js` — Express server, API routes, Anthropic client
- `public/index.html` — UI, all styles inline
- `public/app.js` — frontend logic, conversation history, fetch calls

## Stack

- Node.js + Express
- Anthropic API (`@anthropic-ai/sdk`), model: `claude-haiku-4-5-20251001`
- No build step, no framework — plain HTML/JS frontend
- Use `npm`, not yarn

## API Key

Lives in `.env` as `ANTHROPIC_API_KEY`. Never expose it, never commit it. It's already in `.gitignore`.

## Deployment

Hosted on Render. Auto-deploys when commits are pushed to `main` on GitHub. To ship a change: commit and push to `main`.

## Working on this project

- Don't rebuild what already works. Make the specific change asked, nothing more.
- Keep code and responses clean and simple. No unnecessary abstractions.
- Test locally with `node server.js` (runs on port 3000) before pushing.
- The two API routes are `/api/chat` (conversation) and `/api/reflect` (pattern summary). Keep them separate.
