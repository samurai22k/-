import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from '../firebase';
import {
  CITY_AR_MAP,
  DirectoryCity,
  OfferItem,
  PLACES_DATA,
  PlaceCategory,
  PlaceItem,
  SERVICES_DATA,
  ServiceCategory,
  ServiceItem,
} from '../data/directoryData';

export interface PlaceInput {
  id?: string;
  name: string;
  nameAr: string;
  category: PlaceCategory;
  city: DirectoryCity;
  address: string;
  nearestMetro: string;
  nearestMetroAr: string;
  description: string;
  descriptionAr: string;
  isHalal: boolean;
  latitude: number;
  longitude: number;
  phone: string;
  imageUrl: string;
  isActive: boolean;
}

export interface OfferInput {
  id?: string;
  placeId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  discountPercentage: number;
  promoCode: string;
  expiresAt: string;
  isActive: boolean;
}

export interface ServiceInput {
  id?: string;
  fullName: string;
  fullNameAr: string;
  category: ServiceCategory;
  city: DirectoryCity;
  specialty: string;
  specialtyAr: string;
  languagesSpoken: string[];
  languagesSpokenAr: string[];
  phone: string;
  whatsappUrl: string;
  telegramUrl: string;
  isVerified: boolean;
  isActive: boolean;
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function checkIsUserAdmin(uid: string, email: string | null, emailVerified: boolean): Promise<boolean> {
  if (!emailVerified) return false;
  if (email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  const adminPath = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, adminPath);
  }
}

export function formatFirestoreErrorMessage(err: unknown, isAr: boolean): string {
  const raw = err instanceof Error ? err.message : String(err);
  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as {error?: string};
    if (parsed && typeof parsed.error === 'string') {
      extracted = parsed.error;
    }
  } catch {
    // not JSON
  }
  const lower = extracted.toLowerCase();
  if (lower.includes('resource-exhausted') || lower.includes('quota')) {
    return isAr
      ? 'تم تجاوز حد الاستخدام المجاني لقاعدة البيانات حالياً. يرجى المحاولة لاحقاً.'
      : 'Firestore quota limit reached. Please try again later.';
  }
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return isAr
      ? 'ليس لديك صلاحية تنفيذ هذا الإجراء.'
      : 'Insufficient permissions to perform this action.';
  }
  return extracted;
}

export function subscribePlaces(
  onData: (places: Omit<PlaceItem, 'activeOffers'>[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = 'places';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Omit<PlaceItem, 'activeOffers'>[] = snapshot.docs.map((d) => {
        const data = d.data();
        const city = (data.city as DirectoryCity) || 'Moscow';
        return {
          id: d.id,
          name: String(data.name ?? ''),
          nameAr: String(data.nameAr ?? ''),
          category: (data.category as PlaceCategory) || 'restaurant',
          city,
          cityAr: CITY_AR_MAP[city] ?? city,
          address: String(data.address ?? ''),
          nearestMetro: String(data.nearestMetro ?? ''),
          nearestMetroAr: String(data.nearestMetroAr ?? ''),
          description: String(data.description ?? ''),
          descriptionAr: String(data.descriptionAr ?? ''),
          isHalal: Boolean(data.isHalal),
          latitude: Number(data.latitude ?? 0),
          longitude: Number(data.longitude ?? 0),
          phone: String(data.phone ?? ''),
          imageUrl: String(
            data.imageUrl ?? '/src/assets/images/halal_restaurant_moscow_1794779573022.jpg',
          ),
          isActive: data.isActive !== false,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted instanceof Error ? formatted : new Error(String(formatted)));
      }
    },
  );
}

export function subscribeAllOffers(
  onData: (offers: OfferItem[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = 'offers';
  return onSnapshot(
    collectionGroup(db, 'offers'),
    (snapshot) => {
      const items: OfferItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          placeId: String(data.placeId ?? d.ref.parent.parent?.id ?? ''),
          title: String(data.title ?? ''),
          titleAr: String(data.titleAr ?? ''),
          description: String(data.description ?? ''),
          descriptionAr: String(data.descriptionAr ?? ''),
          discountPercentage: Number(data.discountPercentage ?? 10),
          promoCode: String(data.promoCode ?? ''),
          expiresAt: String(data.expiresAt ?? ''),
          isActive: data.isActive !== false,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted instanceof Error ? formatted : new Error(String(formatted)));
      }
    },
  );
}

export function subscribeServices(
  onData: (services: ServiceItem[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = 'services';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ServiceItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        const city = (data.city as DirectoryCity) || 'Moscow';
        return {
          id: d.id,
          fullName: String(data.fullName ?? ''),
          fullNameAr: String(data.fullNameAr ?? ''),
          category: (data.category as ServiceCategory) || 'translator',
          city,
          cityAr: CITY_AR_MAP[city] ?? city,
          specialty: String(data.specialty ?? ''),
          specialtyAr: String(data.specialtyAr ?? ''),
          languagesSpoken: Array.isArray(data.languagesSpoken)
            ? data.languagesSpoken.map(String)
            : [],
          languagesSpokenAr: Array.isArray(data.languagesSpokenAr)
            ? data.languagesSpokenAr.map(String)
            : [],
          phone: String(data.phone ?? ''),
          whatsappUrl: String(data.whatsappUrl ?? ''),
          telegramUrl: String(data.telegramUrl ?? ''),
          isVerified: Boolean(data.isVerified),
          isActive: data.isActive !== false,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted instanceof Error ? formatted : new Error(String(formatted)));
      }
    },
  );
}

export async function savePlace(
  input: PlaceInput,
  existsInFirestore: boolean,
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');

  const id = input.id && /^[a-zA-Z0-9_-]+$/.test(input.id) ? input.id : generateId('place');
  const path = `places/${id}`;
  const ref = doc(db, 'places', id);

  const commonFields = {
    name: input.name.trim().slice(0, 160),
    nameAr: input.nameAr.trim().slice(0, 160),
    category: input.category,
    city: input.city,
    address: input.address.trim().slice(0, 255),
    nearestMetro: input.nearestMetro.trim().slice(0, 120),
    nearestMetroAr: input.nearestMetroAr.trim().slice(0, 120),
    description: input.description.trim().slice(0, 1500),
    descriptionAr: input.descriptionAr.trim().slice(0, 1500),
    isHalal: Boolean(input.isHalal),
    latitude: Math.max(-90, Math.min(90, Number(input.latitude))),
    longitude: Math.max(-180, Math.min(180, Number(input.longitude))),
    phone: input.phone.trim().slice(0, 40),
    imageUrl: input.imageUrl.trim().slice(0, 500),
    isActive: Boolean(input.isActive),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existsInFirestore) {
      await updateDoc(ref, commonFields);
    } else {
      await setDoc(ref, {
        ...commonFields,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existsInFirestore ? OperationType.UPDATE : OperationType.CREATE,
      path,
    );
  }
}

export async function removePlace(placeId: string): Promise<void> {
  const path = `places/${placeId}`;
  try {
    await deleteDoc(doc(db, 'places', placeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveOffer(
  input: OfferInput,
  existsInFirestore: boolean,
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');

  const id = input.id && /^[a-zA-Z0-9_-]+$/.test(input.id) ? input.id : generateId('offer');
  const path = `places/${input.placeId}/offers/${id}`;
  const ref = doc(db, 'places', input.placeId, 'offers', id);

  const commonFields = {
    title: input.title.trim().slice(0, 160),
    titleAr: input.titleAr.trim().slice(0, 160),
    description: input.description.trim().slice(0, 1000),
    descriptionAr: input.descriptionAr.trim().slice(0, 1000),
    discountPercentage: Math.max(1, Math.min(100, Math.round(Number(input.discountPercentage)))),
    promoCode: input.promoCode.trim().slice(0, 32).toUpperCase(),
    expiresAt: input.expiresAt.trim().slice(0, 32),
    isActive: Boolean(input.isActive),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existsInFirestore) {
      await updateDoc(ref, commonFields);
    } else {
      await setDoc(ref, {
        ...commonFields,
        placeId: input.placeId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existsInFirestore ? OperationType.UPDATE : OperationType.CREATE,
      path,
    );
  }
}

export async function removeOffer(placeId: string, offerId: string): Promise<void> {
  const path = `places/${placeId}/offers/${offerId}`;
  try {
    await deleteDoc(doc(db, 'places', placeId, 'offers', offerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveService(
  input: ServiceInput,
  existsInFirestore: boolean,
): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');

  const id =
    input.id && /^[a-zA-Z0-9_-]+$/.test(input.id) ? input.id : generateId('service');
  const path = `services/${id}`;
  const ref = doc(db, 'services', id);

  const langs = input.languagesSpoken
    .map((l) => l.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);
  const langsAr = input.languagesSpokenAr
    .map((l) => l.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);

  const commonFields = {
    fullName: input.fullName.trim().slice(0, 140),
    fullNameAr: input.fullNameAr.trim().slice(0, 140),
    category: input.category,
    city: input.city,
    specialty: input.specialty.trim().slice(0, 240),
    specialtyAr: input.specialtyAr.trim().slice(0, 240),
    languagesSpoken: langs.length > 0 ? langs : ['Arabic'],
    languagesSpokenAr: langsAr.length > 0 ? langsAr : ['العربية'],
    phone: input.phone.trim().slice(0, 40),
    whatsappUrl: input.whatsappUrl.trim().slice(0, 255),
    telegramUrl: input.telegramUrl.trim().slice(0, 255),
    isVerified: Boolean(input.isVerified),
    isActive: Boolean(input.isActive),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existsInFirestore) {
      await updateDoc(ref, commonFields);
    } else {
      await setDoc(ref, {
        ...commonFields,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existsInFirestore ? OperationType.UPDATE : OperationType.CREATE,
      path,
    );
  }
}

export async function removeService(serviceId: string): Promise<void> {
  const path = `services/${serviceId}`;
  try {
    await deleteDoc(doc(db, 'services', serviceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterCatalogToFirestore(
  existingPlaceIds: Set<string>,
  existingServiceIds: Set<string>,
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');

  const batch = writeBatch(db);
  let hasOps = false;

  for (const place of PLACES_DATA) {
    if (!existingPlaceIds.has(place.id)) {
      hasOps = true;
      batch.set(doc(db, 'places', place.id), {
        name: place.name,
        nameAr: place.nameAr,
        category: place.category,
        city: place.city,
        address: place.address,
        nearestMetro: place.nearestMetro,
        nearestMetroAr: place.nearestMetroAr,
        description: place.description,
        descriptionAr: place.descriptionAr,
        isHalal: place.isHalal,
        latitude: place.latitude,
        longitude: place.longitude,
        phone: place.phone,
        imageUrl: place.imageUrl,
        isActive: true,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  for (const svc of SERVICES_DATA) {
    if (!existingServiceIds.has(svc.id)) {
      hasOps = true;
      batch.set(doc(db, 'services', svc.id), {
        fullName: svc.fullName,
        fullNameAr: svc.fullNameAr,
        category: svc.category,
        city: svc.city,
        specialty: svc.specialty,
        specialtyAr: svc.specialtyAr,
        languagesSpoken: svc.languagesSpoken,
        languagesSpokenAr: svc.languagesSpokenAr,
        phone: svc.phone,
        whatsappUrl: svc.whatsappUrl,
        telegramUrl: svc.telegramUrl,
        isVerified: svc.isVerified,
        isActive: true,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (!hasOps) return;

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'places+services/seed');
  }

  // Commit offers in a second batch after places exist so Master Gate exists() passes
  const offerBatch = writeBatch(db);
  let hasOffers = false;
  for (const place of PLACES_DATA) {
    for (const offer of place.activeOffers) {
      hasOffers = true;
      offerBatch.set(doc(db, 'places', place.id, 'offers', offer.id), {
        placeId: place.id,
        title: offer.title,
        titleAr: offer.titleAr,
        description: offer.description,
        descriptionAr: offer.descriptionAr,
        discountPercentage: offer.discountPercentage,
        promoCode: offer.promoCode,
        expiresAt: offer.expiresAt,
        isActive: true,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (hasOffers) {
    try {
      await offerBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'places/*/offers/seed');
    }
  }
}
