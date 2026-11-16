import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)


def _load_dotenv() -> None:
    """Load key=value pairs from project .env without requiring extra dependencies."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
WEB_APP_URL = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
FIREBASE_CONFIG_PATH = Path(__file__).resolve().parent.parent / "firebase-applet-config.json"

STARTER_PLACES = [
    {"id": "place-1", "name": "Samarkand Heritage Grill", "nameAr": "مطعم سمرقند التراثي", "city": "Moscow"},
    {"id": "place-2", "name": "Kazan Halal Hub", "nameAr": "بيت الضيافة الكازاني", "city": "Kazan"},
    {"id": "place-3", "name": "Arbat Mosque View Hotel", "nameAr": "فندق إطلالة أربات", "city": "Moscow"},
    {"id": "place-4", "name": "Moscow Student Halal Hostel", "nameAr": "هوستيل طلاب موسكو الحلال", "city": "Moscow"},
    {"id": "place-5", "name": "Neva Crescent Restaurant", "nameAr": "مطعم هلال نيفا", "city": "Saint Petersburg"},
    {"id": "place-6", "name": "Black Sea Halal Villa Hotel", "nameAr": "فندق فيلا البحر الأسود", "city": "Sochi"},
]

router = Router(name="business_offers")


class OfferSubmissionFSM(StatesGroup):
    waiting_for_place_id = State()
    waiting_for_title = State()
    waiting_for_description = State()
    waiting_for_discount = State()
    waiting_for_confirmation = State()


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Publish Offer", callback_data="offer:confirm"),
                InlineKeyboardButton(text="Cancel", callback_data="offer:cancel"),
            ]
        ]
    )


async def fetch_places_from_firestore() -> list[dict[str, str]]:
    places_map: dict[str, dict[str, str]] = {}
    if FIREBASE_CONFIG_PATH.is_file():
        try:
            cfg = json.loads(FIREBASE_CONFIG_PATH.read_text(encoding="utf-8"))
            project_id = cfg.get("projectId")
            db_id = cfg.get("firestoreDatabaseId")
            if project_id and db_id:
                url = (
                    f"https://firestore.googleapis.com/v1/projects/{project_id}"
                    f"/databases/{db_id}/documents/places?pageSize=100"
                )
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                if resp.status_code == 200:
                    for doc in resp.json().get("documents", []):
                        doc_id = doc["name"].rsplit("/", 1)[-1]
                        fields = doc.get("fields", {})
                        if fields.get("isActive", {}).get("booleanValue") is False:
                            continue
                        places_map[doc_id] = {
                            "id": doc_id,
                            "name": fields.get("name", {}).get("stringValue", doc_id),
                            "nameAr": fields.get("nameAr", {}).get("stringValue", doc_id),
                            "city": fields.get("city", {}).get("stringValue", "Russia"),
                        }
        except Exception:
            pass

    for starter in STARTER_PLACES:
        if starter["id"] not in places_map:
            places_map[starter["id"]] = starter

    return list(places_map.values())


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Welcome to the <b>Arabs Guide in Russia</b> Business Panel.\n"
        "Use /new_offer to publish a promotional discount for your restaurant, hotel, or hostel.\n"
        "Use /places to list registered venues or /cancel at any step to abort."
    )


@router.message(Command("places"))
async def cmd_places(message: Message) -> None:
    places = await fetch_places_from_firestore()
    lines = "\n".join(
        f"<b>{idx + 1}.</b> {p['name']} ({p['city']}) — <code>{p['id']}</code>"
        for idx, p in enumerate(places)
    )
    await message.answer(f"<b>Directory Places:</b>\n\n{lines}")


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    if await state.get_state() is None:
        await message.answer("No active submission to cancel.")
        return
    await state.clear()
    await message.answer("Offer submission cancelled.")


@router.message(Command("new_offer"))
async def cmd_new_offer(message: Message, state: FSMContext) -> None:
    await state.clear()
    places = await fetch_places_from_firestore()
    await state.set_state(OfferSubmissionFSM.waiting_for_place_id)
    await state.update_data(places_snapshot=places)
    lines = "\n".join(
        f"<b>{idx + 1}.</b> {p['name']} — <code>{p['id']}</code>"
        for idx, p in enumerate(places[:15])
    )
    await message.answer(
        f"Step 1/4: Reply with the venue number (e.g., <code>1</code>) or Place ID:\n\n{lines}"
    )


@router.message(OfferSubmissionFSM.waiting_for_place_id)
async def process_place_id(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip()
    data = await state.get_data()
    places: list[dict[str, str]] = data.get("places_snapshot", STARTER_PLACES)

    match: dict[str, str] | None = None
    if raw.isdigit():
        idx = int(raw) - 1
        if 0 <= idx < len(places):
            match = places[idx]
        else:
            match = next((p for p in places if p["id"] == f"place-{raw}"), None)
    else:
        match = next((p for p in places if p["id"].lower() == raw.lower()), None)

    if not match:
        await message.answer("Venue not found. Reply with a valid number (e.g., 1) or Place ID.")
        return

    await state.update_data(
        place_id=match["id"],
        place_name=match["name"],
        place_name_ar=match["nameAr"],
    )
    await state.set_state(OfferSubmissionFSM.waiting_for_title)
    await message.answer(
        f"Selected venue: <b>{match['name']}</b>\n\n"
        "Step 2/4: Enter the <b>Offer Title</b> (3–160 characters):"
    )


@router.message(OfferSubmissionFSM.waiting_for_title)
async def process_title(message: Message, state: FSMContext) -> None:
    title = (message.text or "").strip()
    if not (3 <= len(title) <= 160):
        await message.answer("Offer Title must be between 3 and 160 characters.")
        return

    await state.update_data(title=title)
    await state.set_state(OfferSubmissionFSM.waiting_for_description)
    await message.answer("Step 3/4: Enter the <b>Offer Description</b> (terms, dishes, or hours):")


@router.message(OfferSubmissionFSM.waiting_for_description)
async def process_description(message: Message, state: FSMContext) -> None:
    description = (message.text or "").strip()
    if not (5 <= len(description) <= 1000):
        await message.answer("Description must be between 5 and 1000 characters.")
        return

    await state.update_data(description=description)
    await state.set_state(OfferSubmissionFSM.waiting_for_discount)
    await message.answer("Step 4/4: Enter the <b>Discount Percentage</b> (integer from 1 to 100):")


@router.message(OfferSubmissionFSM.waiting_for_discount)
async def process_discount(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip().rstrip("%")
    if not raw.isdigit() or not (1 <= int(raw) <= 100):
        await message.answer("Please enter a whole number between 1 and 100.")
        return

    discount = int(raw)
    await state.update_data(discount_percentage=discount)
    data = await state.get_data()

    await state.set_state(OfferSubmissionFSM.waiting_for_confirmation)
    await message.answer(
        "<b>Review Promotional Offer</b>\n"
        f"Venue: {data['place_name']}\n"
        f"Title: {data['title']}\n"
        f"Description: {data['description']}\n"
        f"Discount: <b>{discount}% OFF</b>\n\n"
        "Confirm publication?",
        reply_markup=confirm_keyboard(),
    )


@router.callback_query(OfferSubmissionFSM.waiting_for_confirmation, F.data == "offer:cancel")
async def cancel_callback(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    if callback.message:
        await callback.message.edit_text("Offer submission cancelled.")
    await callback.answer()


@router.callback_query(OfferSubmissionFSM.waiting_for_confirmation, F.data == "offer:confirm")
async def confirm_callback(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    discount = int(data["discount_percentage"])
    expires_at = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
    submitted_by = (
        f"@{callback.from_user.username}"
        if callback.from_user and callback.from_user.username
        else (callback.from_user.first_name if callback.from_user else "Telegram Owner")
    )

    payload: dict[str, Any] = {
        "placeId": data["place_id"],
        "placeName": data["place_name"],
        "placeNameAr": data.get("place_name_ar", data["place_name"]),
        "title": data["title"],
        "description": data["description"],
        "discountPercentage": discount,
        "promoCode": f"TG{discount}",
        "expiresAt": expires_at,
        "submittedBy": submitted_by,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{WEB_APP_URL}/api/telegram-offers", json=payload)
    except httpx.RequestError:
        await state.clear()
        if callback.message:
            await callback.message.edit_text(
                "Could not reach the web app server. Ensure the web app is running and try again."
            )
        await callback.answer()
        return

    await state.clear()
    if resp.status_code == 201:
        if callback.message:
            await callback.message.edit_text(
                f"Offer submitted for Admin approval ({discount}% OFF — code {payload['promoCode']})."
            )
    else:
        if callback.message:
            await callback.message.edit_text("Failed to submit offer. Please try again later.")
    await callback.answer()


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
