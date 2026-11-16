from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PlaceCategory(str, enum.Enum):
    RESTAURANT = "restaurant"
    HOTEL = "hotel"


class ServiceCategory(str, enum.Enum):
    TRANSLATOR = "translator"
    TAXI = "taxi"


class Place(Base):
    __tablename__ = "places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[PlaceCategory] = mapped_column(
        Enum(PlaceCategory, name="place_category_enum"),
        nullable=False,
        index=True,
    )
    city: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    description_ar: Mapped[str] = mapped_column(Text, nullable=False)
    is_halal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    owner_telegram_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    offers: Mapped[list[Offer]] = relationship(
        "Offer",
        back_populates="place",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_places_city_category_halal", "city", "category", "is_halal"),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_places_latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_places_longitude_range"),
    )


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    discount_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    promo_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    place: Mapped[Place] = relationship("Place", back_populates="offers")

    __table_args__ = (
        CheckConstraint(
            "discount_percentage BETWEEN 1 AND 100",
            name="ck_offers_discount_percentage_range",
        ),
        Index("ix_offers_active_window", "place_id", "is_active", "expires_at"),
    )


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(140), nullable=False)
    full_name_ar: Mapped[str] = mapped_column(String(140), nullable=False)
    category: Mapped[ServiceCategory] = mapped_column(
        Enum(ServiceCategory, name="service_category_enum"),
        nullable=False,
        index=True,
    )
    city: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    specialty: Mapped[str] = mapped_column(String(180), nullable=False)
    languages_spoken: Mapped[list[str]] = mapped_column(
        ARRAY(String(40)), nullable=False, default=list
    )
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    whatsapp_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telegram_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_services_city_category", "city", "category", "is_active"),
    )
