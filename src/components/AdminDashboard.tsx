import React, {useMemo, useState} from 'react';
import {User, signInWithPopup, signOut} from 'firebase/auth';
import {
  CheckCircle2,
  Database,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {auth, googleProvider} from '../firebase';
import {
  PLACE_CATEGORIES,
  PlaceCategory,
  PlaceItem,
  SERVICE_CATEGORIES,
  ServiceCategory,
  ServiceItem,
} from '../data/directoryData';
import {
  formatFirestoreErrorMessage,
  removePlace,
  removeService,
  saveOffer,
  savePlace,
  seedStarterCatalogToFirestore,
} from '../services/directoryService';
import {PlaceFormModal} from './PlaceFormModal';
import {ServiceFormModal} from './ServiceFormModal';

interface TelegramOfferQueueItem {
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

interface AdminDashboardProps {
  lang: 'ar' | 'en';
  user: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  places: PlaceItem[];
  services: ServiceItem[];
  firestorePlaceIds: Set<string>;
  firestoreServiceIds: Set<string>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  user,
  authLoading,
  isAdmin,
  places,
  services,
  firestorePlaceIds,
  firestoreServiceIds,
}) => {
  const isAr = lang === 'ar';

  const [section, setSection] = useState<'places' | 'services'>('places');
  const [search, setSearch] = useState('');
  const [placeCatFilter, setPlaceCatFilter] = useState<'all' | PlaceCategory>('all');
  const [serviceCatFilter, setServiceCatFilter] = useState<'all' | ServiceCategory>('all');

  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const editingPlace = useMemo(
    () => (editingPlaceId ? places.find((p) => p.id === editingPlaceId) ?? null : null),
    [editingPlaceId, places],
  );
  const editingService = useMemo(
    () => (editingServiceId ? services.find((s) => s.id === editingServiceId) ?? null : null),
    [editingServiceId, services],
  );

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Telegram Bot Queue State
  const [tgBotUsername, setTgBotUsername] = useState<string | null>(null);
  const [tgPollingActive, setTgPollingActive] = useState(false);
  const [tgOffers, setTgOffers] = useState<TelegramOfferQueueItem[]>([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgProcessingId, setTgProcessingId] = useState<string | null>(null);

  const loadTelegramQueue = React.useCallback(async () => {
    setTgLoading(true);
    try {
      const resp = await fetch('/api/telegram-offers');
      if (!resp.ok) return;
      const data = (await resp.json()) as {
        botUsername?: string | null;
        pollingActive?: boolean;
        offers?: TelegramOfferQueueItem[];
      };
      setTgBotUsername(data.botUsername ?? null);
      setTgPollingActive(Boolean(data.pollingActive));
      setTgOffers(Array.isArray(data.offers) ? data.offers : []);
    } catch {
      // Ignore if running in static/offline preview
    } finally {
      setTgLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;
    void loadTelegramQueue();
    const timer = setInterval(() => {
      void loadTelegramQueue();
    }, 10000);
    return () => clearInterval(timer);
  }, [isAdmin, loadTelegramQueue]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isAr
            ? 'تعذر تسجيل الدخول'
            : 'Sign-in failed',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSeedCatalog = async () => {
    setSeeding(true);
    setErrorMessage(null);
    try {
      await seedStarterCatalogToFirestore(firestorePlaceIds, firestoreServiceIds);
      showToast(
        isAr
          ? 'تم ترحيل الدليل المبدئي إلى قاعدة البيانات بنجاح.'
          : 'Starter catalog synced to Cloud Firestore.',
      );
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setSeeding(false);
    }
  };

  const handleDeletePlace = async (id: string) => {
    setErrorMessage(null);
    try {
      await removePlace(id);
      setConfirmDeleteId(null);
      showToast(isAr ? 'تم حذف المكان.' : 'Place deleted.');
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err, isAr));
    }
  };

  const handleDeleteService = async (id: string) => {
    setErrorMessage(null);
    try {
      await removeService(id);
      setConfirmDeleteId(null);
      showToast(isAr ? 'تم حذف الخدمة.' : 'Service deleted.');
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err, isAr));
    }
  };

  const handlePublishTelegramOffer = async (item: TelegramOfferQueueItem) => {
    setTgProcessingId(item.id);
    setErrorMessage(null);
    try {
      // Ensure target place exists in Firestore before creating subcollection offer
      if (!firestorePlaceIds.has(item.placeId)) {
        const targetPlace = places.find((p) => p.id === item.placeId);
        if (!targetPlace) {
          throw new Error(
            isAr
              ? 'المكان المستهدف غير موجود في الدليل.'
              : 'Target place was not found in directory.',
          );
        }
        await savePlace(
          {
            id: targetPlace.id,
            name: targetPlace.name,
            nameAr: targetPlace.nameAr,
            category: targetPlace.category,
            city: targetPlace.city,
            address: targetPlace.address,
            nearestMetro: targetPlace.nearestMetro,
            nearestMetroAr: targetPlace.nearestMetroAr,
            description: targetPlace.description,
            descriptionAr: targetPlace.descriptionAr,
            isHalal: targetPlace.isHalal,
            latitude: targetPlace.latitude,
            longitude: targetPlace.longitude,
            phone: targetPlace.phone,
            imageUrl: targetPlace.imageUrl,
            isActive: targetPlace.isActive,
          },
          false,
        );
      }

      await saveOffer(
        {
          placeId: item.placeId,
          title: item.title,
          titleAr: item.title,
          description: item.description,
          descriptionAr: item.description,
          discountPercentage: item.discountPercentage,
          promoCode: item.promoCode,
          expiresAt: item.expiresAt,
          isActive: true,
        },
        false,
      );

      await fetch(`/api/telegram-offers/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      }).catch(() => {});

      setTgOffers((prev) => prev.filter((o) => o.id !== item.id));
      showToast(
        isAr
          ? 'تم نشر عرض تيليجرام في الدليل المباشر.'
          : 'Telegram offer published to live directory.',
      );
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setTgProcessingId(null);
    }
  };

  const handleDismissTelegramOffer = async (id: string) => {
    setTgProcessingId(id);
    try {
      await fetch(`/api/telegram-offers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setTgOffers((prev) => prev.filter((o) => o.id !== id));
    } catch {
      // ignore
    } finally {
      setTgProcessingId(null);
    }
  };

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (placeCatFilter !== 'all' && p.category !== placeCatFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.nameAr} ${p.city} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [places, placeCatFilter, search]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (serviceCatFilter !== 'all' && s.category !== serviceCatFilter) return false;
      if (q) {
        const hay = `${s.fullName} ${s.fullNameAr} ${s.city} ${s.specialty}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [services, serviceCatFilter, search]);

  const totalOffers = useMemo(
    () => places.reduce((acc, p) => acc + p.activeOffers.length, 0),
    [places],
  );
  const halalPlacesCount = useMemo(
    () => places.filter((p) => p.isHalal).length,
    [places],
  );
  const verifiedServicesCount = useMemo(
    () => services.filter((s) => s.isVerified).length,
    [services],
  );

  const missingStarterDocs = firestorePlaceIds.size === 0 || firestoreServiceIds.size === 0;

  if (authLoading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          {isAr ? 'جارٍ التحقق من جلسة الإدارة...' : 'Verifying admin session...'}
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          {isAr ? 'لوحة تحكم إدارة الدليل' : 'Directory Admin Console'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {isAr
            ? 'سجّل الدخول بحساب المدير لإضافة أو تعديل المطاعم والفنادق والهوستيلات والخدمات والعروض الترويجية.'
            : 'Sign in with your verified administrator Google account to add and edit restaurants, hotels, hostels, services, and offers.'}
        </p>
        {errorMessage && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            {errorMessage}
          </p>
        )}
        <button
          type="button"
          disabled={signingIn}
          onClick={handleGoogleSignIn}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          <span>
            {signingIn
              ? isAr
                ? 'جارٍ تسجيل الدخول...'
                : 'Signing in...'
              : isAr
                ? 'تسجيل الدخول عبر Google'
                : 'Sign in with Google'}
          </span>
        </button>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto mt-6 max-w-lg rounded-2xl border border-amber-200 bg-white p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">
          {isAr ? 'صلاحيات الإدارة مطلوبة' : 'Administrator Access Required'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isAr
            ? `الحساب المسجّل (${user.email}) لا يملك صلاحية التعديل على الدليل.`
            : `Signed-in account (${user.email}) does not have admin write permissions.`}
        </p>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-5">
      {/* Top Admin Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {isAr ? 'لوحة الإدارة' : 'Admin Console'} · {user.email}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {isAr ? 'إدارة الأماكن والخدمات والعروض' : 'Manage Listings & Services'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (section === 'places') {
                setEditingPlaceId(null);
                setPlaceModalOpen(true);
              } else {
                setEditingServiceId(null);
                setServiceModalOpen(true);
              }
            }}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>
              {section === 'places'
                ? isAr
                  ? 'إضافة مكان جديد'
                  : 'Add Place'
                : isAr
                  ? 'إضافة خدمة جديدة'
                  : 'Add Service'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span>{isAr ? 'خروج' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {missingStarterDocs && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isAr
                  ? 'ترحيل البيانات المبدئية إلى قاعدة البيانات'
                  : 'Sync Starter Catalog to Cloud Firestore'}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {isAr
                  ? 'اضغط لحفظ المطاعم والفنادق والهوستيلات والخدمات الافتراضية في Firestore لتتمكن من تعديلها وحذفها بشكل دائم.'
                  : 'Persist the starter restaurants, hotels, hostels, and services into Firestore so all visitors see live updates.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedCatalog}
            className="min-h-[40px] shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {seeding
              ? isAr
                ? 'جارٍ المزامنة...'
                : 'Syncing...'
              : isAr
                ? 'حفظ في قاعدة البيانات'
                : 'Sync Starter Catalog'}
          </button>
        </div>
      )}

      {/* 3-Column KPI Strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {isAr ? 'الأماكن المسجلة' : 'Places Listed'}
          </p>
          <p className="font-mono-tabular mt-1 text-2xl font-bold text-slate-900">
            {places.length}
          </p>
          <p className="font-mono-tabular mt-0.5 text-[11px] text-emerald-700">
            {halalPlacesCount} {isAr ? 'حلال' : 'Halal'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {isAr ? 'الخدمات المسجلة' : 'Services Listed'}
          </p>
          <p className="font-mono-tabular mt-1 text-2xl font-bold text-slate-900">
            {services.length}
          </p>
          <p className="font-mono-tabular mt-0.5 text-[11px] text-emerald-700">
            {verifiedServicesCount} {isAr ? 'موثق' : 'Verified'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {isAr ? 'العروض النشطة' : 'Active Offers'}
          </p>
          <p className="font-mono-tabular mt-1 text-2xl font-bold text-slate-900">
            {totalOffers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {isAr ? 'خصومات وعروض' : 'Live discounts'}
          </p>
        </div>
      </div>

      {/* Telegram Bot Business Submissions Queue */}
      {(tgPollingActive || tgOffers.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isAr
                    ? 'عروض بوت تيليجرام لأصحاب الأعمال'
                    : 'Telegram Bot Offer Submissions'}
                </h3>
                <p className="text-xs text-slate-500">
                  {tgBotUsername ? (
                    <span dir="ltr" className="font-mono-tabular font-semibold text-emerald-700">
                      @{tgBotUsername}
                    </span>
                  ) : null}
                  {tgBotUsername ? ' · ' : ''}
                  {isAr
                    ? 'أرسل /new_offer في البوت لاستلام العروض هنا'
                    : 'Send /new_offer in Telegram to queue offers here'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {tgBotUsername && (
                <a
                  href={`https://t.me/${tgBotUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{isAr ? 'فتح البوت' : 'Open Bot'}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => void loadTelegramQueue()}
                disabled={tgLoading}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${tgLoading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {tgOffers.length === 0 ? (
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {isAr
                ? 'لا توجد عروض بانتظار المراجعة حالياً. جرّب إرسال /new_offer عبر تيليجرام.'
                : 'No pending Telegram offers right now. Send /new_offer in Telegram to test.'}
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {tgOffers.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {isAr ? item.placeNameAr : item.placeName} ·{' '}
                      <span dir="ltr">{item.submittedBy}</span> ·{' '}
                      <span className="font-mono-tabular font-semibold text-amber-800">
                        -{item.discountPercentage}% ({item.promoCode})
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={tgProcessingId === item.id}
                      onClick={() => handlePublishTelegramOffer(item)}
                      className="min-h-[38px] rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {isAr ? 'نشر في الدليل' : 'Publish Live'}
                    </button>
                    <button
                      type="button"
                      disabled={tgProcessingId === item.id}
                      onClick={() => handleDismissTelegramOffer(item.id)}
                      className="min-h-[38px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isAr ? 'تجاهل' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section Switcher + Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start">
            <button
              type="button"
              onClick={() => setSection('places')}
              className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                section === 'places'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? `الأماكن (${places.length})` : `Places (${places.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSection('services')}
              className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                section === 'services'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? `الخدمات (${services.length})` : `Services (${services.length})`}
            </button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم أو المدينة...' : 'Filter by name or city...'}
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 ps-9 pe-3 text-xs text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
              />
            </div>

            {section === 'places' ? (
              <select
                value={placeCatFilter}
                onChange={(e) =>
                  setPlaceCatFilter(e.target.value as 'all' | PlaceCategory)
                }
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">{isAr ? 'كل التصنيفات' : 'All Categories'}</option>
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {isAr ? c.ar : c.en}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={serviceCatFilter}
                onChange={(e) =>
                  setServiceCatFilter(e.target.value as 'all' | ServiceCategory)
                }
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">{isAr ? 'كل الخدمات' : 'All Categories'}</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {isAr ? c.ar : c.en}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* PLACES TABLE / LIST */}
        {section === 'places' && (
          <div className="divide-y divide-slate-100">
            {filteredPlaces.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {isAr ? 'لا توجد أماكن مطابقة.' : 'No matching places found.'}
              </div>
            ) : (
              filteredPlaces.map((place) => {
                const inDb = firestorePlaceIds.has(place.id);
                const catLabel = PLACE_CATEGORIES.find((c) => c.key === place.category);
                return (
                  <div
                    key={place.id}
                    className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{isAr ? place.cityAr : place.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>{isAr ? catLabel?.ar : catLabel?.en}</span>
                        {place.isHalal && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700">
                              {isAr ? 'حلال' : 'Halal'}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            place.isActive
                              ? 'font-semibold text-emerald-700'
                              : 'font-semibold text-amber-700'
                          }
                        >
                          {place.isActive
                            ? isAr
                              ? 'منشور'
                              : 'Published'
                            : isAr
                              ? 'مسودة'
                              : 'Draft'}
                        </span>
                        {!inDb && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-400">
                              {isAr ? 'افتراضي' : 'Starter'}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-bold text-slate-900">
                        {isAr ? place.nameAr : place.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {place.address} ·{' '}
                        <span className="font-mono-tabular">
                          {place.activeOffers.length}{' '}
                          {isAr ? 'عروض' : 'offers'}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlaceId(place.id);
                          setPlaceModalOpen(true);
                        }}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      {inDb &&
                        (confirmDeleteId === place.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeletePlace(place.id)}
                              className="min-h-[38px] rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              {isAr ? 'تأكيد الحذف' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[38px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(place.id)}
                            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50"
                            aria-label={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SERVICES TABLE / LIST */}
        {section === 'services' && (
          <div className="divide-y divide-slate-100">
            {filteredServices.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {isAr ? 'لا توجد خدمات مطابقة.' : 'No matching services found.'}
              </div>
            ) : (
              filteredServices.map((svc) => {
                const inDb = firestoreServiceIds.has(svc.id);
                const catLabel = SERVICE_CATEGORIES.find((c) => c.key === svc.category);
                return (
                  <div
                    key={svc.id}
                    className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{isAr ? svc.cityAr : svc.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>{isAr ? catLabel?.ar : catLabel?.en}</span>
                        {svc.isVerified && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700">
                              {isAr ? 'موثق' : 'Verified'}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            svc.isActive
                              ? 'font-semibold text-emerald-700'
                              : 'font-semibold text-amber-700'
                          }
                        >
                          {svc.isActive
                            ? isAr
                              ? 'منشور'
                              : 'Published'
                            : isAr
                              ? 'مسودة'
                              : 'Draft'}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-sm font-bold text-slate-900">
                        {isAr ? svc.fullNameAr : svc.fullName}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {isAr ? svc.specialtyAr : svc.specialty} ·{' '}
                        <span className="font-mono-tabular" dir="ltr">
                          {svc.phone}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServiceId(svc.id);
                          setServiceModalOpen(true);
                        }}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      {inDb &&
                        (confirmDeleteId === svc.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteService(svc.id)}
                              className="min-h-[38px] rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              {isAr ? 'تأكيد الحذف' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[38px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(svc.id)}
                            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50"
                            aria-label={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PlaceFormModal
        isOpen={placeModalOpen}
        place={editingPlace}
        existsInFirestore={Boolean(editingPlace && firestorePlaceIds.has(editingPlace.id))}
        lang={lang}
        onClose={() => setPlaceModalOpen(false)}
        onSaved={showToast}
      />

      <ServiceFormModal
        isOpen={serviceModalOpen}
        service={editingService}
        existsInFirestore={Boolean(
          editingService && firestoreServiceIds.has(editingService.id),
        )}
        lang={lang}
        onClose={() => setServiceModalOpen(false)}
        onSaved={showToast}
      />
    </section>
  );
};
