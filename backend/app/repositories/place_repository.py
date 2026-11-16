from datetime import datetime, timezone
from typing import Optional, Sequence

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager

from app.models import Offer, Place, PlaceCategory, Service, ServiceCategory
from app.schemas import OfferCreate


class PlaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_places_with_active_offers(
        self,
        *,
        city: Optional[str] = None,
        category: Optional[PlaceCategory] = None,
        halal_only: bool = False,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Place]:
        now = datetime.now(timezone.utc)
        offer_join_cond = and_(
            Offer.place_id == Place.id,
            Offer.is_active.is_(True),
            or_(Offer.expires_at.is_(None), Offer.expires_at > now),
        )

        stmt = (
            select(Place)
            .outerjoin(Offer, offer_join_cond)
            .options(contains_eager(Place.offers))
            .where(Place.is_active.is_(True))
        )

        if city:
            stmt = stmt.where(Place.city.ilike(city))
        if category:
            stmt = stmt.where(Place.category == category)
        if halal_only:
            stmt = stmt.where(Place.is_halal.is_(True))
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Place.name.ilike(pattern),
                    Place.name_ar.ilike(pattern),
                    Place.description.ilike(pattern),
                )
            )

        stmt = stmt.order_by(Place.id.asc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return result.unique().scalars().all()

    async def get_place_by_id(self, place_id: int) -> Optional[Place]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(Place)
            .outerjoin(
                Offer,
                and_(
                    Offer.place_id == Place.id,
                    Offer.is_active.is_(True),
                    or_(Offer.expires_at.is_(None), Offer.expires_at > now),
                ),
            )
            .options(contains_eager(Place.offers))
            .where(Place.id == place_id, Place.is_active.is_(True))
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def list_active_offers(
        self,
        *,
        city: Optional[str] = None,
        min_discount: Optional[int] = None,
    ) -> Sequence[Offer]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(Offer)
            .join(Place, Offer.place_id == Place.id)
            .where(
                Place.is_active.is_(True),
                Offer.is_active.is_(True),
                or_(Offer.expires_at.is_(None), Offer.expires_at > now),
            )
        )
        if city:
            stmt = stmt.where(Place.city.ilike(city))
        if min_discount is not None:
            stmt = stmt.where(Offer.discount_percentage >= min_discount)

        stmt = stmt.order_by(Offer.discount_percentage.desc(), Offer.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_offer(self, payload: OfferCreate) -> Offer:
        offer = Offer(
            place_id=payload.place_id,
            title=payload.title,
            description=payload.description,
            discount_percentage=payload.discount_percentage,
            promo_code=payload.promo_code,
            expires_at=payload.expires_at,
            is_active=True,
        )
        self.session.add(offer)
        await self.session.flush()
        await self.session.refresh(offer)
        return offer

    async def list_services(
        self,
        *,
        city: Optional[str] = None,
        category: Optional[ServiceCategory] = None,
    ) -> Sequence[Service]:
        stmt = select(Service).where(Service.is_active.is_(True))
        if city:
            stmt = stmt.where(Service.city.ilike(city))
        if category:
            stmt = stmt.where(Service.category == category)
        stmt = stmt.order_by(Service.is_verified.desc(), Service.id.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
