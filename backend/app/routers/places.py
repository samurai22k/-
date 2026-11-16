from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import PlaceCategory, ServiceCategory
from app.repositories.place_repository import PlaceRepository
from app.schemas import OfferCreate, OfferOut, PlaceOut, ServiceOut

router = APIRouter(prefix="/places", tags=["Places & Offers"])


def get_place_repo(db: Annotated[AsyncSession, Depends(get_db)]) -> PlaceRepository:
    return PlaceRepository(db)


PlaceRepoDep = Annotated[PlaceRepository, Depends(get_place_repo)]


@router.get("", response_model=list[PlaceOut])
async def list_places(
    repo: PlaceRepoDep,
    city: Optional[str] = Query(default=None, description="Filter by city (e.g. Moscow, Kazan)"),
    category: Optional[PlaceCategory] = Query(default=None),
    halal_only: bool = Query(default=False, description="Return only Halal-certified places"),
    q: Optional[str] = Query(default=None, min_length=2, max_length=80),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[PlaceOut]:
    places = await repo.get_places_with_active_offers(
        city=city,
        category=category,
        halal_only=halal_only,
        search=q,
        limit=limit,
        offset=offset,
    )
    return [
        PlaceOut(
            id=p.id,
            name=p.name,
            name_ar=p.name_ar,
            category=p.category,
            city=p.city,
            address=p.address,
            description=p.description,
            description_ar=p.description_ar,
            is_halal=p.is_halal,
            latitude=p.latitude,
            longitude=p.longitude,
            phone=p.phone,
            active_offers=[OfferOut.model_validate(o) for o in p.offers],
        )
        for p in places
    ]


@router.get("/offers/active", response_model=list[OfferOut])
async def list_active_offers(
    repo: PlaceRepoDep,
    city: Optional[str] = Query(default=None),
    min_discount: Optional[int] = Query(default=None, ge=1, le=100),
) -> list[OfferOut]:
    offers = await repo.list_active_offers(city=city, min_discount=min_discount)
    return [OfferOut.model_validate(o) for o in offers]


@router.get("/services", response_model=list[ServiceOut])
async def list_services(
    repo: PlaceRepoDep,
    city: Optional[str] = Query(default=None),
    category: Optional[ServiceCategory] = Query(default=None),
) -> list[ServiceOut]:
    services = await repo.list_services(city=city, category=category)
    return [ServiceOut.model_validate(s) for s in services]


@router.get("/{place_id}", response_model=PlaceOut)
async def get_place_detail(place_id: int, repo: PlaceRepoDep) -> PlaceOut:
    place = await repo.get_place_by_id(place_id)
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Place {place_id} not found",
        )
    return PlaceOut(
        id=place.id,
        name=place.name,
        name_ar=place.name_ar,
        category=place.category,
        city=place.city,
        address=place.address,
        description=place.description,
        description_ar=place.description_ar,
        is_halal=place.is_halal,
        latitude=place.latitude,
        longitude=place.longitude,
        phone=place.phone,
        active_offers=[OfferOut.model_validate(o) for o in place.offers],
    )


@router.post("/offers", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
async def create_offer(payload: OfferCreate, repo: PlaceRepoDep) -> OfferOut:
    place = await repo.get_place_by_id(payload.place_id)
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Place {payload.place_id} not found",
        )
    offer = await repo.create_offer(payload)
    return OfferOut.model_validate(offer)
