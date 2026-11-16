import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import {createServer as createViteServer} from 'vite';

if (process.env.ENABLE_HMR !== 'true' && !process.env.DISABLE_HMR) {
  process.env.DISABLE_HMR = 'true';
}
import {
  addTelegramOfferToQueue,
  getTelegramBotStatus,
  removeTelegramOfferFromQueue,
  startTelegramBotPoller,
} from './bot/telegramPoller.ts';

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const port = isProd ? Number(process.env.PORT) || 3000 : 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // Telegram Bot Queue API for Admin Dashboard moderation
  app.get('/api/telegram-offers', (_req, res) => {
    res.json(getTelegramBotStatus());
  });

  app.post('/api/telegram-offers', (req, res) => {
    const body = req.body ?? {};
    const placeId = String(body.placeId ?? '').trim();
    const placeName = String(body.placeName ?? placeId).trim();
    const placeNameAr = String(body.placeNameAr ?? placeName).trim();
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const discount = Math.round(Number(body.discountPercentage));

    if (
      !placeId ||
      title.length < 3 ||
      title.length > 160 ||
      description.length < 5 ||
      description.length > 1000 ||
      Number.isNaN(discount) ||
      discount < 1 ||
      discount > 100
    ) {
      res.status(400).json({error: 'Invalid offer submission payload'});
      return;
    }

    const created = addTelegramOfferToQueue({
      placeId,
      placeName,
      placeNameAr,
      title,
      description,
      discountPercentage: discount,
      promoCode: String(body.promoCode || `TG${discount}`).slice(0, 32).toUpperCase(),
      expiresAt:
        String(body.expiresAt || '').slice(0, 32) ||
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      submittedBy: String(body.submittedBy || 'Telegram Bot').slice(0, 80),
    });
    res.status(201).json(created);
  });

  app.delete('/api/telegram-offers/:id', (req, res) => {
    const removed = removeTelegramOfferFromQueue(req.params.id);
    res.json({removed});
  });

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  let stopBot: (() => void) | null = null;
  if (botToken && botToken !== 'MY_TELEGRAM_BOT_TOKEN') {
    stopBot = startTelegramBotPoller(botToken);
  }

  if (!isProd) {
    const hmrEnabled = process.env.ENABLE_HMR === 'true' && process.env.DISABLE_HMR !== 'true';
    if (!hmrEnabled) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(id) { return id; }
export class ErrorOverlay {}
`);
      });
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? {server: httpServer} : false,
        watch: hmrEnabled ? {} : null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });

  const shutdown = () => {
    stopBot?.();
    httpServer.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void startServer();
