import React, {useEffect, useMemo, useRef, useState} from 'react';
import {User, onAuthStateChanged} from 'firebase/auth';
import {
  BookmarkCheck,
  Check,
  Compass,
  Copy,
  Globe,
  HardDriveDownload,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TrainFront,
  Users,
  Utensils,
} from 'lucide-react';
import {
  CityKey,
  METRO_LINES_DATA,
  OfferItem,
  PLACE_CATEGORIES,
  PLACES_DATA,
  PlaceCategory,
  PlaceItem,
  SERVICE_CATEGORIES,
  SERVICES_DATA,
  ServiceCategory,
  ServiceItem,
  TOURIST_SPOTS_DATA,
} from './data/directoryData';
import {auth} from './firebase';
import {
  checkIsUserAdmin,
  formatFirestoreErrorMessage,
  subscribeAllOffers,
  subscribePlaces,
  subscribeServices,
} from './services/directoryService';
import {PWAInstallButton} from './components/PWAInstallButton';
import {OfflineIndicator} from './components/OfflineIndicator';
import {SafeImage} from './components/SafeImage';
import {PlaceDetailSheet} from './components/PlaceDetailSheet';
import {AdminDashboard} from './components/AdminDashboard';
import {MetroRouteVisualizer} from './components/MetroRouteVisualizer';

type TabKey = 'places' | 'saved' | 'services' | 'tourism' | 'metro' | 'admin';
type PlaceFilter = 'all' | PlaceCategory;
type ServiceFilter = 'all' | ServiceCategory;

const OFFLINE_CACHE_KEY = 'arabs_russia_offline_pack_v1';
const SAVED_IDS_KEY = 'arabs_russia_saved_places_v1';

const CITIES: Array<{key: CityKey; ar: string; en: string}> = [
  {key: 'All', ar: 'كل المدن', en: 'All Cities'},
  {key: 'Moscow', ar: 'موسكو', en: 'Moscow'},
  {key: 'Saint Petersburg', ar: 'سانت بطرسبرغ', en: 'St. Petersburg'},
  {key: 'Kazan', ar: 'كازان', en: 'Kazan'},
  {key: 'Sochi', ar: 'سوتشي', en: 'Sochi'},
];

const SECRET_ADMIN_SUBDOMAIN = (
  import.meta.env.VITE_ADMIN_SUBDOMAIN || 'ctrl-ru-7492'
)
  .trim()
  .toLowerCase();
const rawAdminPath = (import.meta.env.VITE_ADMIN_PATH || '/ctrl-ru-7492')
  .trim()
  .toLowerCase();
const SECRET_ADMIN_PATH = rawAdminPath.startsWith('/') ? rawAdminPath : `/${rawAdminPath}`;

function checkIsSecretAdminEntry(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase();

  const matchesSubdomain =
    hostname.startsWith(`${SECRET_ADMIN_SUBDOMAIN}.`) ||
    hostname === SECRET_ADMIN_SUBDOMAIN;
  const matchesPath =
    pathname === SECRET_ADMIN_PATH ||
    pathname.startsWith(`${SECRET_ADMIN_PATH}/`) ||
    hash === `#${SECRET_ADMIN_PATH}`;

  return matchesSubdomain || matchesPath;
}

export default function App() {
  const [isSecretAdminEntry] = useState<boolean>(() => checkIsSecretAdminEntry());
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    checkIsSecretAdminEntry() ? 'admin' : 'places',
  );
  const [selectedCity, setSelectedCity] = useState<CityKey>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [halalOnly, setHalalOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [metroCity, setMetroCity] = useState<'Moscow' | 'Saint Petersburg'>('Moscow');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  // Firebase Auth & Admin State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Live Firestore Data State
  const [dbPlaces, setDbPlaces] = useState<Omit<PlaceItem, 'activeOffers'>[] | null>(null);
  const [dbOffers, setDbOffers] = useState<OfferItem[] | null>(null);
  const [dbServices, setDbServices] = useState<ServiceItem[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_IDS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [offlineSyncedAt, setOfflineSyncedAt] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as {syncedAt?: string}).syncedAt ?? null;
    } catch {
      return null;
    }
  });
  const [copiedSpotId, setCopiedSpotId] = useState<number | null>(null);
  const [confirmClearSaved, setConfirmClearSaved] = useState(false);

  const isAr = lang === 'ar';
  const isArRef = useRef(isAr);
  isArRef.current = isAr;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (
      tabParam === 'places' ||
      tabParam === 'saved' ||
      tabParam === 'services' ||
      tabParam === 'tourism' ||
      tabParam === 'metro' ||
      (tabParam === 'admin' && isSecretAdminEntry)
    ) {
      setActiveTab(tabParam);
    }
    if (params.get('halal') === 'true') {
      setHalalOnly(true);
    }
  }, [isSecretAdminEntry]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminFlag = await checkIsUserAdmin(
            currentUser.uid,
            currentUser.email,
            currentUser.emailVerified,
          );
          setIsAdmin(adminFlag);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore subscriptions (public read)
  useEffect(() => {
    const handleSubError = (err: Error) => {
      setSyncError(formatFirestoreErrorMessage(err, isArRef.current));
    };
    const unsubPlaces = subscribePlaces(
      (items) => {
        setSyncError(null);
        setDbPlaces(items);
      },
      handleSubError,
    );
    const unsubOffers = subscribeAllOffers((items) => setDbOffers(items), handleSubError);
    const unsubServices = subscribeServices((items) => setDbServices(items), handleSubError);
    return () => {
      unsubPlaces();
      unsubOffers();
      unsubServices();
    };
  }, []);

  const firestorePlaceIds = useMemo(
    () => new Set((dbPlaces ?? []).map((p) => p.id)),
    [dbPlaces],
  );
  const firestoreServiceIds = useMemo(
    () => new Set((dbServices ?? []).map((s) => s.id)),
    [dbServices],
  );

  // Merge Firestore live records with cached/starter catalog
  const allPlaces: PlaceItem[] = useMemo(() => {
    const offersByPlace = new Map<string, OfferItem[]>();
    for (const offer of dbOffers ?? []) {
      const list = offersByPlace.get(offer.placeId) ?? [];
      list.push(offer);
      offersByPlace.set(offer.placeId, list);
    }

    if (dbPlaces && dbPlaces.length > 0) {
      const firestoreItems: PlaceItem[] = dbPlaces.map((p) => ({
        ...p,
        activeOffers: (offersByPlace.get(p.id) ?? []).filter((o) => o.isActive),
      }));
      // Include starter items not yet migrated so existing catalog stays visible until deleted/migrated
      const starterRemainder = PLACES_DATA.filter((s) => !firestorePlaceIds.has(s.id));
      return [...firestoreItems, ...starterRemainder];
    }

    // Fallback to offline cache if Firestore hasn't populated yet
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {places?: PlaceItem[]};
        if (Array.isArray(parsed.places) && parsed.places.length > 0) {
          return parsed.places;
        }
      }
    } catch {
      // ignore parse failure
    }
    return PLACES_DATA;
  }, [dbPlaces, dbOffers, firestorePlaceIds]);

  const allServices: ServiceItem[] = useMemo(() => {
    if (dbServices && dbServices.length > 0) {
      const starterRemainder = SERVICES_DATA.filter(
        (s) => !firestoreServiceIds.has(s.id),
      );
      return [...dbServices, ...starterRemainder];
    }
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {services?: ServiceItem[]};
        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          return parsed.services;
        }
      }
    } catch {
      // ignore parse failure
    }
    return SERVICES_DATA;
  }, [dbServices, firestoreServiceIds]);

  // Deep-link support for QR code ?place=<id>
  const handledPlaceParamRef = useRef(false);
  useEffect(() => {
    if (handledPlaceParamRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const placeParam = params.get('place');
    if (!placeParam) {
      handledPlaceParamRef.current = true;
      return;
    }
    const found = allPlaces.find((p) => p.id === placeParam);
    if (found) {
      handledPlaceParamRef.current = true;
      setSelectedPlace(found);
    }
  }, [allPlaces]);

  const handleSaveOfflinePack = () => {
    const timestamp = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const payload = {
      syncedAt: timestamp,
      places: allPlaces.filter((p) => p.isActive),
      services: allServices.filter((s) => s.isActive),
      spots: TOURIST_SPOTS_DATA,
      metro: METRO_LINES_DATA,
    };
    try {
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload));
      setOfflineSyncedAt(timestamp);
    } catch {
      setOfflineSyncedAt(timestamp);
    }
  };

  const toggleSavedPlace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const clearAllSavedPlaces = () => {
    setSavedIds([]);
    setConfirmClearSaved(false);
    try {
      localStorage.removeItem(SAVED_IDS_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleCopySpotCoords = async (id: number, lat: number, lon: number) => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      setCopiedSpotId(id);
      setTimeout(() => setCopiedSpotId(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPlaces.filter((place) => {
      if (!place.isActive) return false;
      if (selectedCity !== 'All' && place.city !== selectedCity) return false;
      if (placeFilter !== 'all' && place.category !== placeFilter) return false;
      if (halalOnly && !place.isHalal) return false;
      if (offersOnly && place.activeOffers.length === 0) return false;
      if (q) {
        const hay =
          `${place.name} ${place.nameAr} ${place.description} ${place.descriptionAr} ${place.nearestMetro} ${place.nearestMetroAr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPlaces, selectedCity, placeFilter, halalOnly, offersOnly, searchQuery]);

  const allSavedPlaces = useMemo(() => {
    return allPlaces.filter((place) => place.isActive && savedIds.includes(place.id));
  }, [allPlaces, savedIds]);

  const filteredSavedPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSavedPlaces.filter((place) => {
      if (selectedCity !== 'All' && place.city !== selectedCity) return false;
      if (q) {
        const hay =
          `${place.name} ${place.nameAr} ${place.description} ${place.descriptionAr} ${place.nearestMetro} ${place.nearestMetroAr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSavedPlaces, selectedCity, searchQuery]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allServices.filter((svc) => {
      if (!svc.isActive) return false;
      if (selectedCity !== 'All' && svc.city !== selectedCity) return false;
      if (serviceFilter !== 'all' && svc.category !== serviceFilter) return false;
      if (q) {
        const hay =
          `${svc.fullName} ${svc.fullNameAr} ${svc.specialty} ${svc.specialtyAr} ${svc.languagesSpoken.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allServices, selectedCity, serviceFilter, searchQuery]);

  const filteredSpots = useMemo(() => {
    return TOURIST_SPOTS_DATA.filter(
      (spot) => selectedCity === 'All' || spot.city === selectedCity,
    );
  }, [selectedCity]);

  const filteredMetro = useMemo(() => {
    return METRO_LINES_DATA.filter((line) => line.city === metroCity);
  }, [metroCity]);

  const navItems: Array<{key: TabKey; ar: string; en: string; icon: React.ReactNode}> =
    useMemo(() => {
      const publicItems: Array<{
        key: TabKey;
        ar: string;
        en: string;
        icon: React.ReactNode;
      }> = [
        {
          key: 'places',
          ar: 'الأماكن',
          en: 'Places',
          icon: <Utensils className="h-5 w-5" />,
        },
        {
          key: 'saved',
          ar: 'المحفوظة',
          en: 'Saved',
          icon: <BookmarkCheck className="h-5 w-5" />,
        },
        {
          key: 'services',
          ar: 'الخدمات',
          en: 'Services',
          icon: <Users className="h-5 w-5" />,
        },
        {
          key: 'tourism',
          ar: 'المعالم',
          en: 'Tourism',
          icon: <Compass className="h-5 w-5" />,
        },
        {
          key: 'metro',
          ar: 'المترو',
          en: 'Metro',
          icon: <TrainFront className="h-5 w-5" />,
        },
      ];
      if (isSecretAdminEntry) {
        publicItems.push({
          key: 'admin',
          ar: 'الإدارة',
          en: 'Admin',
          icon: <SlidersHorizontal className="h-5 w-5" />,
        });
      }
      return publicItems;
    }, [isSecretAdminEntry]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-12">
      {/* Desktop 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-8 px-4 md:h-16 md:px-6">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className="text-start text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 md:text-lg"
          >
            {isAr ? 'دليل العرب في روسيا' : 'Arabs Guide Russia'}
          </button>

          {/* Zone 2: 5 Single-line Navigation Links (Desktop) */}
          <nav
            className="hidden items-center gap-6 text-sm font-semibold md:flex"
            aria-label={isAr ? 'التنقل الرئيسي' : 'Primary navigation'}
          >
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`border-b-2 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-emerald-700 text-emerald-800'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? item.ar : item.en}
                  {item.key === 'saved' && allSavedPlaces.length > 0 && (
                    <span className="font-mono-tabular ms-1 text-xs text-emerald-700">
                      ({allSavedPlaces.length})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Language Switch) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 md:min-h-[40px]"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-6">
        {syncError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            <span>{syncError}</span>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              {isAr ? 'إخفاء' : 'Dismiss'}
            </button>
          </div>
        )}
        {/* Hero Banner (shown on public guide tabs) */}
        {activeTab !== 'admin' && (
          <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
            <div className="absolute inset-0">
              <SafeImage
                src="/src/assets/images/hero_moscow_skyline_1794779572248.jpg"
                alt={isAr ? 'أفق موسكو والساحة الحمراء' : 'Moscow Red Square skyline'}
                fallbackType="metro"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/25" />
            </div>

            <div className="relative z-10 flex flex-col justify-end gap-4 p-5 sm:p-8 md:min-h-[250px] lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-emerald-300">
                  {isAr
                    ? 'موسكو · سانت بطرسبرغ · كازان · سوتشي'
                    : 'Moscow · Saint Petersburg · Kazan · Sochi'}
                </p>
                <h1
                  className="mt-1.5 text-2xl font-bold leading-tight sm:text-3xl"
                  style={{textWrap: 'balance'}}
                >
                  {isAr
                    ? 'دليل العرب الشامل في روسيا — يعمل بدون إنترنت'
                    : 'Your Offline-Ready Companion Across Russia'}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">
                  {isAr
                    ? 'مطاعم حلال موثقة، فنادق وهوستيلات بعروض حصرية، مترجمون وسائقون، وخرائط المترو والمعالم السياحية في متناول يدك.'
                    : 'Verified Halal dining, hotels and hostels with active offers, trusted Arabic-speaking translators and drivers, plus cached Metro & landmark guides.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PWAInstallButton lang={lang} />
                <button
                  type="button"
                  onClick={handleSaveOfflinePack}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 whitespace-nowrap shrink-0"
                >
                  {offlineSyncedAt ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <HardDriveDownload className="h-4 w-4" />
                  )}
                  <span>
                    {offlineSyncedAt
                      ? isAr
                        ? `محفوظ بدون نت (${offlineSyncedAt})`
                        : `Cached Offline (${offlineSyncedAt})`
                      : isAr
                        ? 'حفظ للعمل بدون نت'
                        : 'Save Offline Pack'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Global Search & City Filter Bar */}
        {activeTab !== 'metro' && activeTab !== 'admin' && (
          <section className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث عن مطعم، فندق، هوستيل، مترجم...'
                    : 'Search places, hostels, offers, translators...'
                }
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {CITIES.map((city) => {
                const selected = selectedCity === city.key;
                return (
                  <button
                    key={city.key}
                    type="button"
                    onClick={() => setSelectedCity(city.key)}
                    className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? city.ar : city.en}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 1: PLACES DIRECTORY */}
        {activeTab === 'places' && (
          <section className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPlaceFilter('all')}
                  className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    placeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                {PLACE_CATEGORIES.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPlaceFilter(tab.key)}
                    className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      placeFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isAr ? tab.ar : tab.en}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHalalOnly((v) => !v)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    halalOnly
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isAr ? 'حلال فقط' : 'Halal Only'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOffersOnly((v) => !v)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    offersOnly
                      ? 'border-amber-700 bg-amber-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{isAr ? 'بها عروض نشطة' : 'Active Offers'}</span>
                </button>
              </div>
            </div>

            {filteredPlaces.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {isAr
                    ? 'لا توجد نتائج مطابقة للتصفية الحالية.'
                    : 'No places match your current filters.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity('All');
                    setPlaceFilter('all');
                    setHalalOnly(false);
                    setOffersOnly(false);
                    setSearchQuery('');
                  }}
                  className="mt-3 min-h-[40px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlaces.map((place) => {
                  const isSaved = savedIds.includes(place.id);
                  const topOffer = place.activeOffers[0];
                  const catMeta = PLACE_CATEGORIES.find((c) => c.key === place.category);
                  return (
                    <article
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                        <SafeImage
                          src={place.imageUrl}
                          alt={isAr ? place.nameAr : place.name}
                          fallbackType={place.category}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleSavedPlace(place.id, e)}
                          aria-label={
                            isAr ? 'حفظ المكان في المفضلة' : 'Save place offline'
                          }
                          className={`absolute top-3 end-3 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl backdrop-blur-sm transition-colors ${
                            isSaved
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-950/60 text-white hover:bg-slate-950/80'
                          }`}
                        >
                          <BookmarkCheck className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        {/* Unboxed Clean Metadata */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{isAr ? place.cityAr : place.city}</span>
                          <span aria-hidden="true">·</span>
                          <span>{isAr ? catMeta?.ar : catMeta?.en}</span>
                          {place.isHalal && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {isAr ? 'حلال' : 'Halal'}
                              </span>
                            </>
                          )}
                        </div>

                        <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                          {isAr ? place.nameAr : place.name}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {isAr ? place.descriptionAr : place.description}
                        </p>

                        {topOffer && (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-900">
                              <span className="truncate">
                                {isAr ? topOffer.titleAr : topOffer.title}
                              </span>
                              <span className="font-mono-tabular shrink-0 text-amber-800">
                                -{topOffer.discountPercentage}%
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 truncate">
                            <TrainFront className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {isAr ? place.nearestMetroAr : place.nearestMetro}
                            </span>
                          </span>
                          <span className="font-mono-tabular shrink-0 text-[11px] text-slate-400">
                            {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 1B: SAVED / FAVORITES VIEW */}
        {activeTab === 'saved' && (
          <section className="mt-5 space-y-5">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isAr ? 'الأماكن المحفوظة والمفضلة' : 'Saved & Favorite Places'}
                  {allSavedPlaces.length > 0 && (
                    <span className="font-mono-tabular ms-2 text-base font-semibold text-emerald-700">
                      ({allSavedPlaces.length})
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isAr
                    ? 'وصول سريع لأماكنك المفضلة المحفوظة على هذا الجهاز حتى بدون إنترنت.'
                    : 'Quick access to your bookmarked restaurants, hotels, and hostels stored locally on this device.'}
                </p>
              </div>

              {allSavedPlaces.length > 0 && (
                <div className="flex shrink-0 items-center gap-2">
                  {confirmClearSaved ? (
                    <>
                      <button
                        type="button"
                        onClick={clearAllSavedPlaces}
                        className="min-h-[40px] rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        {isAr ? 'تأكيد المسح' : 'Confirm Clear'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearSaved(false)}
                        className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearSaved(true)}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isAr ? 'مسح المحفوظات' : 'Clear Saved'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {allSavedPlaces.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BookmarkCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {isAr ? 'لا توجد أماكن محفوظة بعد' : 'No saved places yet'}
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
                  {isAr
                    ? 'اضغط على أيقونة الحفظ في أي مطعم أو فندق أو هوستيل لإضافته هنا والرجوع إليه بسرعة في رحلاتك القادمة.'
                    : 'Tap the bookmark icon on any restaurant, hotel, or hostel card to keep it handy here for your repeat visits.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('places')}
                  className="mt-5 min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  {isAr ? 'استكشاف الأماكن' : 'Browse Places'}
                </button>
              </div>
            ) : filteredSavedPlaces.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {isAr
                    ? 'لا توجد أماكن محفوظة مطابقة لبحثك أو المدينة المختارة.'
                    : 'No saved places match your current city or search filter.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity('All');
                    setSearchQuery('');
                  }}
                  className="mt-3 min-h-[40px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  {isAr ? 'عرض كل المحفوظات' : 'Show All Saved'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredSavedPlaces.map((place) => {
                  const topOffer = place.activeOffers[0];
                  const catMeta = PLACE_CATEGORIES.find((c) => c.key === place.category);
                  return (
                    <article
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
                    >
                      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                        <SafeImage
                          src={place.imageUrl}
                          alt={isAr ? place.nameAr : place.name}
                          fallbackType={place.category}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleSavedPlace(place.id, e)}
                          aria-label={
                            isAr ? 'إزالة من المحفوظات' : 'Remove from saved'
                          }
                          className="absolute top-3 end-3 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-emerald-700 text-white backdrop-blur-sm transition-colors hover:bg-emerald-800"
                        >
                          <BookmarkCheck className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{isAr ? place.cityAr : place.city}</span>
                          <span aria-hidden="true">·</span>
                          <span>{isAr ? catMeta?.ar : catMeta?.en}</span>
                          {place.isHalal && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {isAr ? 'حلال' : 'Halal'}
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                          {isAr ? place.nameAr : place.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <TrainFront className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {isAr ? place.nearestMetroAr : place.nearestMetro}
                          </span>
                        </p>

                        {topOffer && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2">
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-900">
                              <span className="truncate">
                                {isAr ? topOffer.titleAr : topOffer.title}
                              </span>
                              <span className="font-mono-tabular shrink-0 text-amber-800">
                                -{topOffer.discountPercentage}%
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                          <a
                            href={`tel:${place.phone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                          >
                            <Phone className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{isAr ? 'اتصال' : 'Call'}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlace(place);
                            }}
                            className="flex min-h-[40px] items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                          >
                            {isAr ? 'التفاصيل والموقع' : 'Details & Map'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: SERVICES DIRECTORY */}
        {activeTab === 'services' && (
          <section className="mt-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setServiceFilter('all')}
                  className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    serviceFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'جميع الخدمات' : 'All Services'}
                </button>
                {SERVICE_CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setServiceFilter(item.key)}
                    className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      serviceFilter === item.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isAr ? item.ar : item.en}
                  </button>
                ))}
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {isAr
                    ? 'لا توجد خدمات مطابقة للتصفية الحالية.'
                    : 'No services match your current filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredServices.map((svc) => {
                  const catMeta = SERVICE_CATEGORIES.find((c) => c.key === svc.category);
                  return (
                    <article
                      key={svc.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{isAr ? svc.cityAr : svc.city}</span>
                          <span aria-hidden="true">·</span>
                          <span>{isAr ? catMeta?.ar : catMeta?.en}</span>
                          {svc.isVerified && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-emerald-700">
                                {isAr ? 'موثق' : 'Verified'}
                              </span>
                            </>
                          )}
                        </div>

                        <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                          {isAr ? svc.fullNameAr : svc.fullName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {isAr ? svc.specialtyAr : svc.specialty}
                        </p>

                        <div className="mt-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {isAr ? 'اللغات: ' : 'Languages: '}
                          </span>
                          <span>
                            {(isAr ? svc.languagesSpokenAr : svc.languagesSpoken).join(' · ')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
                        {svc.whatsappUrl ? (
                          <a
                            href={svc.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                          >
                            <MessageCircle className="h-4 w-4 shrink-0" />
                            <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                          </a>
                        ) : (
                          <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-400">
                            —
                          </span>
                        )}
                        {svc.telegramUrl ? (
                          <a
                            href={svc.telegramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                          >
                            <Send className="h-4 w-4 shrink-0" />
                            <span>{isAr ? 'تيليجرام' : 'Telegram'}</span>
                          </a>
                        ) : (
                          <span className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-400">
                            —
                          </span>
                        )}
                        <a
                          href={`tel:${svc.phone.replace(/[^+\d]/g, '')}`}
                          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                        >
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{isAr ? 'اتصال' : 'Call'}</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: OFFLINE TOURISM GUIDE */}
        {activeTab === 'tourism' && (
          <section className="mt-5 space-y-5">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isAr ? 'دليل المعالم السياحية والمساجد' : 'Cached Landmarks & Mosques'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isAr
                    ? 'بيانات متاحة دون إنترنت تشمل ساعات العمل، رسوم الدخول، وأقرب محطة مترو.'
                    : 'Always-available offline records with opening hours, entry notes, and GPS coordinates.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredSpots.map((spot) => (
                <article
                  key={spot.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{isAr ? spot.cityAr : spot.city}</span>
                      <span aria-hidden="true">·</span>
                      <span>{isAr ? spot.categoryLabelAr : spot.categoryLabel}</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                      {isAr ? spot.nameAr : spot.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {isAr ? spot.notesAr : spot.notes}
                    </p>

                    <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">
                          {isAr ? 'ساعات العمل' : 'Opening Hours'}
                        </dt>
                        <dd className="font-semibold text-slate-900 text-end">
                          {isAr ? spot.openingHoursAr : spot.openingHours}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">
                          {isAr ? 'رسوم الدخول' : 'Entry Fee'}
                        </dt>
                        <dd className="font-semibold text-emerald-800 text-end">
                          {isAr ? spot.entryFeeAr : spot.entryFee}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">
                          {isAr ? 'أقرب مترو' : 'Nearest Metro'}
                        </dt>
                        <dd className="font-medium text-slate-800 text-end">
                          {isAr ? spot.nearestMetroAr : spot.nearestMetro}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="font-mono-tabular flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySpotCoords(spot.id, spot.latitude, spot.longitude)
                      }
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {copiedSpotId === spot.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {copiedSpotId === spot.id
                          ? isAr
                            ? 'تم النسخ'
                            : 'Copied'
                          : isAr
                            ? 'نسخ الموقع'
                            : 'Copy GPS'}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: OFFLINE METRO GUIDE */}
        {activeTab === 'metro' && (
          <section className="mt-5 space-y-6">
            <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-1">
                <SafeImage
                  src="/src/assets/images/moscow_metro_station_1794779573253.jpg"
                  alt={isAr ? 'محطة مترو موسكو' : 'Moscow Metro station architecture'}
                  fallbackType="metro"
                  className="h-48 w-full object-cover lg:h-full"
                />
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isAr
                      ? 'دليل المترو والمواصلات (يعمل بدون إنترنت)'
                      : 'Offline Metro & Transit Guide'}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isAr
                      ? 'يفتح المترو يومياً من 05:30 صباحاً حتى 01:00 بعد منتصف الليل. استخدم بطاقة ترويكا (Troika) في موسكو أو بودوروجنيك (Podorozhnik) في سانت بطرسبرغ لتوفير تكلفة الرحلات.'
                      : 'Metro operates daily from 05:30 to 01:00. Purchase a Troika card in Moscow or Podorozhnik card in Saint Petersburg at any station counter for discounted fares and bus transfers.'}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                    {(
                      [
                        {key: 'Moscow', ar: 'مترو موسكو', en: 'Moscow Metro'},
                        {
                          key: 'Saint Petersburg',
                          ar: 'مترو سانت بطرسبرغ',
                          en: 'St. Petersburg Metro',
                        },
                      ] as const
                    ).map((city) => (
                      <button
                        key={city.key}
                        type="button"
                        onClick={() => setMetroCity(city.key)}
                        className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          metroCity === city.key
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? city.ar : city.en}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono-tabular text-xs font-medium text-slate-500">
                    {isAr ? 'معدل القطار: كل 90 ثانية' : 'Headway: ~90s peak'}
                  </span>
                </div>
              </div>
            </div>

            <MetroRouteVisualizer lines={filteredMetro} lang={lang} />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredMetro.map((line) => (
                <article
                  key={line.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-sm"
                        style={{backgroundColor: line.lineColorHex}}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {line.lineNumber} · {isAr ? line.cityAr : line.city}
                        </p>
                        <h3 className="text-base font-bold text-slate-900">
                          {isAr ? line.nameAr : line.name}
                        </h3>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs font-medium text-slate-500">
                      {line.hours}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-slate-100">
                    {line.keyStations.map((st) => (
                      <li key={st.en} className="py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {isAr ? st.ar : st.en}
                          </span>
                          <span
                            className="font-mono-tabular text-xs text-slate-600"
                            dir="ltr"
                          >
                            {st.ru}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {isAr ? st.landmarkAr : st.landmarkEn}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: ADMIN DASHBOARD (Secret Subdomain / Route Only) */}
        {activeTab === 'admin' && isSecretAdminEntry && (
          <AdminDashboard
            lang={lang}
            user={user}
            authLoading={authLoading}
            isAdmin={isAdmin}
            places={allPlaces}
            services={allServices}
            firestorePlaceIds={firestorePlaceIds}
            firestoreServiceIds={firestoreServiceIds}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe md:hidden"
        aria-label={isAr ? 'التنقل السفلي' : 'Bottom navigation'}
      >
        <div
          className={`grid h-14 items-center ${
            isSecretAdminEntry ? 'grid-cols-6' : 'grid-cols-5'
          }`}
        >
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {isAr ? item.ar : item.en}
                  {item.key === 'saved' && allSavedPlaces.length > 0
                    ? ` (${allSavedPlaces.length})`
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Detail Bottom Sheet */}
      <PlaceDetailSheet
        place={selectedPlace}
        lang={lang}
        onClose={() => setSelectedPlace(null)}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator lang={lang} />
    </div>
  );
}
