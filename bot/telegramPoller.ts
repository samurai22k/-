import fs from 'node:fs';
import path from 'node:path';
import {PLACES_DATA} from '../src/data/directoryData.ts';

export interface TelegramOfferSubmission {
  id: string;
  placeId: string;
  placeName: string;
  placeNameAr: string;
  title: string;
  description: string;
  discountPercentage: number;
  promoCode: string;
  expiresAt: string;
  submittedBy: string;
  submittedAt: string;
}

interface PlaceSummary {
  id: string;
  name: string;
  nameAr: string;
  city: string;
}

type FsmStep =
  | 'waiting_for_place_id'
  | 'waiting_for_title'
  | 'waiting_for_description'
  | 'waiting_for_discount'
  | 'waiting_for_confirmation';

interface ChatSession {
  step: FsmStep;
  placesSnapshot: PlaceSummary[];
  placeId?: string;
  placeName?: string;
  placeNameAr?: string;
  title?: string;
  description?: string;
  discountPercentage?: number;
}

const QUEUE_FILE = path.resolve(import.meta.dirname, '..', '.telegram-offers.json');

function loadQueue(): TelegramOfferSubmission[] {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore corrupt local queue
  }
  return [];
}

function saveQueue(items: TelegramOfferSubmission[]): void {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {
    // ignore write failure in read-only env
  }
}

let offersQueue: TelegramOfferSubmission[] = loadQueue();
let activeBotUsername: string | null = null;
let isPollingActive = false;

export function getTelegramBotStatus(): {
  botUsername: string | null;
  pollingActive: boolean;
  offers: TelegramOfferSubmission[];
} {
  return {
    botUsername: activeBotUsername,
    pollingActive: isPollingActive,
    offers: offersQueue,
  };
}

export function addTelegramOfferToQueue(
  input: Omit<TelegramOfferSubmission, 'id' | 'submittedAt'>,
): TelegramOfferSubmission {
  const submission: TelegramOfferSubmission = {
    ...input,
    id: `tg-offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    submittedAt: new Date().toISOString(),
  };
  offersQueue = [submission, ...offersQueue].slice(0, 50);
  saveQueue(offersQueue);
  return submission;
}

export function removeTelegramOfferFromQueue(id: string): boolean {
  const before = offersQueue.length;
  offersQueue = offersQueue.filter((item) => item.id !== id);
  if (offersQueue.length !== before) {
    saveQueue(offersQueue);
    return true;
  }
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function getDefaultExpiryDate(): string {
  const d = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function fetchDirectoryPlaces(): Promise<PlaceSummary[]> {
  const map = new Map<string, PlaceSummary>();

  try {
    const configPath = path.resolve(
      import.meta.dirname,
      '..',
      'firebase-applet-config.json',
    );
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
      if (cfg.projectId && cfg.firestoreDatabaseId) {
        const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/places?pageSize=100`;
        const resp = await fetch(url, {signal: AbortSignal.timeout(5000)});
        if (resp.ok) {
          const data = (await resp.json()) as {
            documents?: Array<{
              name: string;
              fields?: Record<string, {stringValue?: string; booleanValue?: boolean}>;
            }>;
          };
          for (const doc of data.documents ?? []) {
            const docId = doc.name.split('/').pop() ?? '';
            const f = doc.fields ?? {};
            if (f.isActive?.booleanValue === false) continue;
            map.set(docId, {
              id: docId,
              name: f.name?.stringValue ?? docId,
              nameAr: f.nameAr?.stringValue ?? f.name?.stringValue ?? docId,
              city: f.city?.stringValue ?? 'Russia',
            });
          }
        }
      }
    }
  } catch {
    // Fall back gracefully to starter catalog
  }

  for (const starter of PLACES_DATA) {
    if (!map.has(starter.id)) {
      map.set(starter.id, {
        id: starter.id,
        name: starter.name,
        nameAr: starter.nameAr,
        city: starter.city,
      });
    }
  }

  return Array.from(map.values());
}

async function callTelegram(
  token: string,
  method: string,
  body?: Record<string, unknown>,
  timeoutMs = 35000,
): Promise<any> {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return resp.json();
}

export function startTelegramBotPoller(token: string): () => void {
  let stopped = false;
  let offset = 0;
  const sessions = new Map<number, ChatSession>();

  const sendMessage = async (
    chatId: number,
    text: string,
    replyMarkup?: Record<string, unknown>,
  ) => {
    await callTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? {reply_markup: replyMarkup} : {}),
    });
  };

  const startNewOfferFlow = async (chatId: number) => {
    const places = await fetchDirectoryPlaces();
    sessions.set(chatId, {
      step: 'waiting_for_place_id',
      placesSnapshot: places,
    });

    const buttons = places.slice(0, 10).map((p, idx) => [
      {
        text: `${idx + 1}. ${p.name} (${p.city})`,
        callback_data: `pick_place:${p.id}`,
      },
    ]);

    const listText = places
      .slice(0, 15)
      .map((p, idx) => `<b>${idx + 1}.</b> ${escapeHtml(p.name)} — <code>${escapeHtml(p.id)}</code>`)
      .join('\n');

    await sendMessage(
      chatId,
      `<b>Step 1/4: Select Venue</b>\nTap a venue below or reply with its number (e.g. <code>1</code>) or Place ID:\n\n${listText}`,
      {inline_keyboard: buttons},
    );
  };

  const handlePlaceChosen = async (
    chatId: number,
    session: ChatSession,
    place: PlaceSummary,
  ) => {
    session.placeId = place.id;
    session.placeName = place.name;
    session.placeNameAr = place.nameAr;
    session.step = 'waiting_for_title';

    await sendMessage(
      chatId,
      `Selected venue: <b>${escapeHtml(place.name)}</b>\n\n` +
        `<b>Step 2/4:</b> Enter the <b>Offer Title</b> (3–160 characters):`,
    );
  };

  const handleUpdate = async (update: any) => {
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId: number | undefined = cq.message?.chat?.id;
      const messageId: number | undefined = cq.message?.message_id;
      const data: string = cq.data ?? '';
      if (!chatId) return;

      await callTelegram(token, 'answerCallbackQuery', {callback_query_id: cq.id}).catch(
        () => {},
      );

      if (data === 'cmd:new_offer') {
        await startNewOfferFlow(chatId);
        return;
      }

      if (data === 'cmd:places') {
        const places = await fetchDirectoryPlaces();
        const text = places
          .map(
            (p, idx) =>
              `<b>${idx + 1}.</b> ${escapeHtml(p.name)} (${escapeHtml(p.city)})\n   ID: <code>${escapeHtml(p.id)}</code>`,
          )
          .join('\n');
        await sendMessage(chatId, `<b>Directory Places:</b>\n\n${text}`);
        return;
      }

      const session = sessions.get(chatId);

      if (data.startsWith('pick_place:') && session?.step === 'waiting_for_place_id') {
        const placeId = data.slice('pick_place:'.length);
        const match = session.placesSnapshot.find((p) => p.id === placeId);
        if (match) {
          await handlePlaceChosen(chatId, session, match);
        }
        return;
      }

      if (data === 'offer:cancel' && session) {
        sessions.delete(chatId);
        if (messageId) {
          await callTelegram(token, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: 'Offer submission cancelled.',
          }).catch(() => {});
        } else {
          await sendMessage(chatId, 'Offer submission cancelled.');
        }
        return;
      }

      if (data === 'offer:confirm' && session?.step === 'waiting_for_confirmation') {
        const discount = session.discountPercentage ?? 10;
        const fromUser = cq.from?.username
          ? `@${cq.from.username}`
          : cq.from?.first_name || 'Telegram Owner';

        const submission: TelegramOfferSubmission = {
          id: `tg-offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          placeId: session.placeId!,
          placeName: session.placeName!,
          placeNameAr: session.placeNameAr!,
          title: session.title!,
          description: session.description!,
          discountPercentage: discount,
          promoCode: `TG${discount}`,
          expiresAt: getDefaultExpiryDate(),
          submittedBy: fromUser,
          submittedAt: new Date().toISOString(),
        };

        offersQueue = [submission, ...offersQueue].slice(0, 50);
        saveQueue(offersQueue);
        sessions.delete(chatId);

        const doneText =
          `✅ <b>Offer submitted for review!</b>\n\n` +
          `Venue: <b>${escapeHtml(submission.placeName)}</b>\n` +
          `Title: ${escapeHtml(submission.title)}\n` +
          `Discount: <b>${submission.discountPercentage}% OFF</b>\n` +
          `Promo Code: <code>${submission.promoCode}</code>\n\n` +
          `Open the <b>Admin Dashboard</b> in the web app to publish it live to Firestore.`;

        if (messageId) {
          await callTelegram(token, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: doneText,
            parse_mode: 'HTML',
          }).catch(() => {});
        } else {
          await sendMessage(chatId, doneText);
        }
        return;
      }
      return;
    }

    const msg = update.message;
    if (!msg || typeof msg.text !== 'string') return;
    const chatId: number = msg.chat.id;
    const text = msg.text.trim();

    if (text === '/start' || text.startsWith('/start ')) {
      sessions.delete(chatId);
      await sendMessage(
        chatId,
        `Welcome to <b>Arabs Guide in Russia (دليل العرب في روسيا)</b> Business Bot!\n\n` +
          `Use /new_offer to submit a promotional discount for any restaurant, hotel, or hostel.\n` +
          `Use /places to list venues, or /cancel to abort.`,
        {
          inline_keyboard: [
            [
              {text: '➕ New Promotional Offer', callback_data: 'cmd:new_offer'},
              {text: '📍 List Places', callback_data: 'cmd:places'},
            ],
          ],
        },
      );
      return;
    }

    if (text === '/cancel') {
      if (!sessions.has(chatId)) {
        await sendMessage(chatId, 'No active submission to cancel.');
        return;
      }
      sessions.delete(chatId);
      await sendMessage(chatId, 'Offer submission cancelled.');
      return;
    }

    if (text === '/places') {
      const places = await fetchDirectoryPlaces();
      const lines = places
        .map(
          (p, idx) =>
            `<b>${idx + 1}.</b> ${escapeHtml(p.name)} (${escapeHtml(p.city)})\n   ID: <code>${escapeHtml(p.id)}</code>`,
        )
        .join('\n');
      await sendMessage(chatId, `<b>Directory Places:</b>\n\n${lines}`);
      return;
    }

    if (text === '/new_offer') {
      await startNewOfferFlow(chatId);
      return;
    }

    const session = sessions.get(chatId);
    if (!session) {
      await sendMessage(chatId, 'Send /new_offer to submit a promotional offer, or /places to view venues.');
      return;
    }

    if (session.step === 'waiting_for_place_id') {
      let match: PlaceSummary | undefined;
      if (/^\d+$/.test(text)) {
        const idx = Number(text) - 1;
        match = session.placesSnapshot[idx];
        if (!match) {
          match = session.placesSnapshot.find((p) => p.id === `place-${text}`);
        }
      } else {
        match = session.placesSnapshot.find(
          (p) => p.id.toLowerCase() === text.toLowerCase(),
        );
      }

      if (!match) {
        await sendMessage(
          chatId,
          'Venue not found. Tap a button above or reply with a number (e.g. <code>1</code>) or exact Place ID (e.g. <code>place-1</code>).',
        );
        return;
      }

      await handlePlaceChosen(chatId, session, match);
      return;
    }

    if (session.step === 'waiting_for_title') {
      if (text.length < 3 || text.length > 160) {
        await sendMessage(chatId, 'Offer Title must be between 3 and 160 characters.');
        return;
      }
      session.title = text;
      session.step = 'waiting_for_description';
      await sendMessage(
        chatId,
        '<b>Step 3/4:</b> Enter the <b>Offer Description</b> (terms, dishes, or hours, min 5 chars):',
      );
      return;
    }

    if (session.step === 'waiting_for_description') {
      if (text.length < 5 || text.length > 1000) {
        await sendMessage(chatId, 'Description must be between 5 and 1000 characters.');
        return;
      }
      session.description = text;
      session.step = 'waiting_for_discount';
      await sendMessage(
        chatId,
        '<b>Step 4/4:</b> Enter the <b>Discount Percentage</b> (whole number from 1 to 100):',
      );
      return;
    }

    if (session.step === 'waiting_for_discount') {
      const cleaned = text.replace(/%$/, '').trim();
      const num = Number(cleaned);
      if (!/^\d+$/.test(cleaned) || num < 1 || num > 100) {
        await sendMessage(chatId, 'Please enter a whole number between 1 and 100.');
        return;
      }
      session.discountPercentage = num;
      session.step = 'waiting_for_confirmation';

      await sendMessage(
        chatId,
        `<b>Review Promotional Offer</b>\n` +
          `Venue: <b>${escapeHtml(session.placeName ?? '')}</b>\n` +
          `Title: ${escapeHtml(session.title ?? '')}\n` +
          `Description: ${escapeHtml(session.description ?? '')}\n` +
          `Discount: <b>${num}% OFF</b>\n\n` +
          `Confirm submission?`,
        {
          inline_keyboard: [
            [
              {text: '✅ Publish Offer', callback_data: 'offer:confirm'},
              {text: '❌ Cancel', callback_data: 'offer:cancel'},
            ],
          ],
        },
      );
    }
  };

  const loop = async () => {
    try {
      const me = await callTelegram(token, 'getMe', undefined, 8000);
      if (me?.ok && me?.result?.username) {
        activeBotUsername = me.result.username;
        isPollingActive = true;
        console.log(`Telegram Bot connected: @${activeBotUsername}`);
      } else {
        console.warn('Telegram Bot getMe failed:', me?.description ?? 'Invalid token');
        return;
      }
    } catch (err) {
      console.warn('Telegram Bot startup error:', err);
      return;
    }

    while (!stopped) {
      try {
        const res = await callTelegram(
          token,
          'getUpdates',
          {offset, timeout: 25, allowed_updates: ['message', 'callback_query']},
          35000,
        );

        if (!res?.ok) {
          if (res?.error_code === 409) {
            console.warn('Telegram Bot polling conflict (another instance running). Retrying in 5s...');
            await new Promise((r) => setTimeout(r, 5000));
          } else {
            await new Promise((r) => setTimeout(r, 2000));
          }
          continue;
        }

        for (const update of res.result ?? []) {
          offset = Math.max(offset, Number(update.update_id) + 1);
          try {
            await handleUpdate(update);
          } catch (err) {
            console.error('Telegram update error:', err);
          }
        }
      } catch (err) {
        if (!stopped) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
    isPollingActive = false;
  };

  void loop();

  return () => {
    stopped = true;
    isPollingActive = false;
  };
}
