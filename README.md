# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Features Implemented

- Product selection by clicking product cards
- Selected-product highlight in the grid
- Selected products list with remove buttons
- Clear-all selected products button
- localStorage persistence for selected products
- Product description toggle on each card
- Category filter + keyword search together
- Routine generation from selected product JSON
- Follow-up chat with full conversation history
- Topic guardrails for routine/beauty domains
- Optional live web search mode with citations
- RTL layout toggle with saved preference

## Cloudflare Worker Setup

Use the Worker code in [worker.js](worker.js). In your Cloudflare dashboard:

1. Create or open your Worker.
2. Add secret: `OPENAI_API_KEY`.
3. Deploy and copy your Worker URL.

This project reads the Worker endpoint from [config.js](config.js):

```js
window.APP_CONFIG = {
  WORKER_URL: "https://your-worker-url.workers.dev/",
};
```

## GitHub Pages + Repository Secrets

A GitHub Actions workflow is included at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

Set one of these in your GitHub repo:

- Secret: `WORKER_URL` (recommended)
- Variable: `WORKER_URL`

On each push to `main`, the workflow injects that value into `config.js` during deployment, so your GitHub Pages site can call your Worker without hardcoding it in source.
