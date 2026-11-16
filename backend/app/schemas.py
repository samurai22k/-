from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import PlaceCategory, ServiceCategory


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: int
    title: str
    description: str
    discount_percentage: int = Field(ge=1, le=100)
    promo_code: Optional[str] = None
    is_active: bool
    starts_at: datetime
    expires_at: Optional[datetime] = None


class OfferCreate(BaseModel):
    place_id: int
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=5, max_length=1000)
    discount_percentage: int = Field(ge=1, le=100)
    promo_code: Optional[str] = Field(default=None, max_length=32)
    expires_at: Optional[datetime] = None


class PlaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    name_ar: str
    category: PlaceCategory
    city: str
    address: str
    description: str
    description_ar: str
    is_halal: bool
    latitude: float
    longitude: float
    phone: Optional[str] = None
    active_offers: list[OfferOut] = Field(default_factory=list)


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    full_name_ar: str
    category: ServiceCategory
    city: str
    specialty: str
    languages_spoken: list[str]
    phone: str
    whatsapp_url: Optional[str] = None
    telegram_url: Optional[str] = None
    is_verified: bool
