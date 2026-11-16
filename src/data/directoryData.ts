export type PlaceCategory =
  | 'restaurant'
  | 'hotel'
  | 'hostel'
  | 'cafe'
  | 'grocery'
  | 'other';

export type ServiceCategory =
  | 'translator'
  | 'taxi'
  | 'legal'
  | 'medical'
  | 'housing'
  | 'other';

export type CityKey = 'All' | 'Moscow' | 'Saint Petersburg' | 'Kazan' | 'Sochi';
export type DirectoryCity = Exclude<CityKey, 'All'>;

export interface OfferItem {
  id: string;
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

export interface PlaceItem {
  id: string;
  name: string;
  nameAr: string;
  category: PlaceCategory;
  city: DirectoryCity;
  cityAr: string;
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
  activeOffers: OfferItem[];
  isStarter?: boolean;
}

export interface ServiceItem {
  id: string;
  fullName: string;
  fullNameAr: string;
  category: ServiceCategory;
  city: DirectoryCity;
  cityAr: string;
  specialty: string;
  specialtyAr: string;
  languagesSpoken: string[];
  languagesSpokenAr: string[];
  phone: string;
  whatsappUrl: string;
  telegramUrl: string;
  isVerified: boolean;
  isActive: boolean;
  isStarter?: boolean;
}

export interface TouristSpot {
  id: number;
  name: string;
  nameAr: string;
  city: DirectoryCity;
  cityAr: string;
  categoryLabel: string;
  categoryLabelAr: string;
  openingHours: string;
  openingHoursAr: string;
  entryFee: string;
  entryFeeAr: string;
  nearestMetro: string;
  nearestMetroAr: string;
  latitude: number;
  longitude: number;
  notes: string;
  notesAr: string;
}

export interface MetroLineGuide {
  id: string;
  city: 'Moscow' | 'Saint Petersburg';
  cityAr: string;
  lineNumber: string;
  lineColorHex: string;
  name: string;
  nameAr: string;
  hours: string;
  keyStations: Array<{
    ar: string;
    en: string;
    ru: string;
    landmarkAr: string;
    landmarkEn: string;
  }>;
}

export const CITY_AR_MAP: Record<DirectoryCity, string> = {
  Moscow: 'موسكو',
  'Saint Petersburg': 'سانت بطرسبرغ',
  Kazan: 'كازان',
  Sochi: 'سوتشي',
};

export const CITY_COORDS_PRESETS: Record<DirectoryCity, {lat: number; lon: number}> = {
  Moscow: {lat: 55.7558, lon: 37.6173},
  'Saint Petersburg': {lat: 59.9343, lon: 30.3351},
  Kazan: {lat: 55.7961, lon: 49.1064},
  Sochi: {lat: 43.5855, lon: 39.7231},
};

export const PLACE_CATEGORIES: Array<{
  key: PlaceCategory;
  ar: string;
  en: string;
}> = [
  {key: 'restaurant', ar: 'مطعم', en: 'Restaurant'},
  {key: 'hotel', ar: 'فندق', en: 'Hotel'},
  {key: 'hostel', ar: 'هوستيل / سكن', en: 'Hostel'},
  {key: 'cafe', ar: 'مقهى', en: 'Cafe'},
  {key: 'grocery', ar: 'بقالة حلال', en: 'Halal Grocery'},
  {key: 'other', ar: 'أخرى', en: 'Other'},
];

export const SERVICE_CATEGORIES: Array<{
  key: ServiceCategory;
  ar: string;
  en: string;
}> = [
  {key: 'translator', ar: 'مترجم', en: 'Translator'},
  {key: 'taxi', ar: 'تاكسي ومطار', en: 'Taxi & Transfer'},
  {key: 'legal', ar: 'استشارات وتأشيرات', en: 'Legal & Visa'},
  {key: 'medical', ar: 'مرافقة طبية', en: 'Medical Support'},
  {key: 'housing', ar: 'سمسار وسكن طلابي', en: 'Housing Agent'},
  {key: 'other', ar: 'خدمة أخرى', en: 'Other Service'},
];

export const PLACES_DATA: PlaceItem[] = [
  {
    id: 'place-1',
    name: 'Samarkand Heritage Grill',
    nameAr: 'مطعم سمرقند التراثي',
    category: 'restaurant',
    city: 'Moscow',
    cityAr: 'موسكو',
    address: 'Prospekt Mira, 109, Moscow',
    nearestMetro: 'VDNKh / Alekseyevskaya',
    nearestMetroAr: 'فدنخا / أليكسييفسكايا',
    description:
      'Authentic Central Asian & Levantine Halal kitchen near the Moscow Cathedral Mosque area. Charcoal kebabs, plov, and family seating.',
    descriptionAr:
      'مطبخ حلال أصيل يجمع بين الأوزبكي والشامي بالقرب من محيط المسجد الجامع. مشاوي على الفحم، بلوف، وجلسات عائلية هادئة.',
    isHalal: true,
    latitude: 55.8124,
    longitude: 37.6378,
    phone: '+7 (495) 687-24-10',
    imageUrl: '/src/assets/images/halal_restaurant_moscow_1794779573022.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [
      {
        id: 'offer-101',
        placeId: 'place-1',
        title: 'Arab Student & Tourist Welcome Menu',
        titleAr: 'خصم الضيافة للطلاب والسياح العرب',
        description: '20% off total bill for university ID holders and tourist groups of 2+.',
        descriptionAr: 'خصم ٢٠٪ على إجمالي الفاتورة لحاملي البطاقة الجامعية والعائلات.',
        discountPercentage: 20,
        promoCode: 'ARAB20',
        expiresAt: '2026-12-31',
        isActive: true,
      },
    ],
  },
  {
    id: 'place-2',
    name: 'Tverskaya Residence Boutique Hotel',
    nameAr: 'فندق تفيرسكايا ريزيدنس',
    category: 'hotel',
    city: 'Moscow',
    cityAr: 'موسكو',
    address: 'Tverskaya St, 24, Moscow',
    nearestMetro: 'Mayakovskaya / Tverskaya',
    nearestMetroAr: 'ماياكوفسكايا / تفيرسكايا',
    description:
      'Quiet 4-star boutique residence within walking distance of Red Square. Offers Halal breakfast option on request and Arabic-speaking reception.',
    descriptionAr:
      'فندق بوتيك هادئ ٤ نجوم على بعد دقائق مشياً من الساحة الحمراء. يوفر إفطاراً حلالاً عند الطلب واستقبالاً يتحدث العربية.',
    isHalal: true,
    latitude: 55.7678,
    longitude: 37.5994,
    phone: '+7 (495) 790-18-55',
    imageUrl: '/src/assets/images/boutique_hotel_moscow_1794779573111.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [
      {
        id: 'offer-102',
        placeId: 'place-2',
        title: 'Extended Winter Stay Discount',
        titleAr: 'عرض الإقامة الطويلة',
        description: '15% discount on bookings of 4 nights or more including airport transfer coordination.',
        descriptionAr: 'خصم ١٥٪ للحجوزات من ٤ ليالٍ فأكثر مع تنسيق استقبال المطار.',
        discountPercentage: 15,
        promoCode: 'STAY15',
        expiresAt: '2026-12-20',
        isActive: true,
      },
    ],
  },
  {
    id: 'place-3',
    name: 'Al-Sham Nevsky Lounge',
    nameAr: 'مطعم الشام — نيفسكي',
    category: 'restaurant',
    city: 'Saint Petersburg',
    cityAr: 'سانت بطرسبرغ',
    address: 'Nevsky Prospekt, 88, Saint Petersburg',
    nearestMetro: 'Mayakovskaya (SPb)',
    nearestMetroAr: 'ماياكوفسكايا (بطرسبرغ)',
    description:
      'Syrian & Lebanese Halal dining in the heart of Nevsky Prospekt. Fresh saj bread, hummus, shawarma, and Arabic coffee.',
    descriptionAr:
      'مطبخ شامي حلال في قلب شارع نيفسكي. خبز صاج طازج، مقبلات، مشاوي، وقهوة عربية طوال اليوم.',
    isHalal: true,
    latitude: 59.9323,
    longitude: 30.3541,
    phone: '+7 (812) 412-90-33',
    imageUrl: '/src/assets/images/halal_restaurant_moscow_1794779573022.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [
      {
        id: 'offer-103',
        placeId: 'place-3',
        title: 'Complimentary Dessert & 12% Off',
        titleAr: 'خصم ١٢٪ مع ضيافة كنافة',
        description: '12% off dinner orders plus complimentary Kunafa when mentioning the guide.',
        descriptionAr: 'خصم ١٢٪ على طلبات العشاء مع طبق كنافة مجاني عند إظهار الدليل.',
        discountPercentage: 12,
        promoCode: 'NEVSKY12',
        expiresAt: '2026-12-15',
        isActive: true,
      },
    ],
  },
  {
    id: 'place-4',
    name: 'Kazan Kremlin View Suites',
    nameAr: 'أجنحة كازان كرملين فيو',
    category: 'hotel',
    city: 'Kazan',
    cityAr: 'كازان',
    address: 'Bauman St, 19, Kazan',
    nearestMetro: 'Kremlyovskaya',
    nearestMetroAr: 'كريمليوفسكايا',
    description:
      'Family-friendly apartments and suites 5 minutes from Kul Sharif Mosque and Kazan Federal University. Full Halal dining nearby.',
    descriptionAr:
      'شقق وأجنحة عائلية على بعد ٥ دقائق من مسجد قل شريف وجامعة كازان الفيدرالية، محاطة بمطاعم حلال معتمدة.',
    isHalal: true,
    latitude: 55.7949,
    longitude: 49.1088,
    phone: '+7 (843) 292-44-70',
    imageUrl: '/src/assets/images/boutique_hotel_moscow_1794779573111.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [],
  },
  {
    id: 'place-5',
    name: 'Black Sea Riviera Hotel',
    nameAr: 'فندق ريفييرا البحر الأسود',
    category: 'hotel',
    city: 'Sochi',
    cityAr: 'سوتشي',
    address: 'Kurortny Prospekt, 54, Sochi',
    nearestMetro: 'Sochi Central Station',
    nearestMetroAr: 'محطة سوتشي المركزية',
    description:
      'Coastal hotel in central Sochi close to seafront promenades and Riviera Park. Non-Halal standard hotel kitchen; Halal dining 300m away.',
    descriptionAr:
      'فندق ساحلي في وسط سوتشي قرب الكورنيش وحديقة ريفييرا. المطبخ الفندقي غير حلال وتتوفر مطاعم حلال على بعد ٣٠٠ متر.',
    isHalal: false,
    latitude: 43.5815,
    longitude: 39.7231,
    phone: '+7 (862) 264-11-20',
    imageUrl: '/src/assets/images/boutique_hotel_moscow_1794779573111.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [
      {
        id: 'offer-105',
        placeId: 'place-5',
        title: 'Early Booking Rate',
        titleAr: 'عرض الحجز المبكر',
        description: '10% off standard rooms booked directly via reception.',
        descriptionAr: 'خصم ١٠٪ على الغرف القياسية عند الحجز المباشر.',
        discountPercentage: 10,
        promoCode: 'SOCHI10',
        expiresAt: '2026-12-30',
        isActive: true,
      },
    ],
  },
  {
    id: 'place-6',
    name: 'Yugo-Zapad Student Hostel',
    nameAr: 'هوستيل يوغو زاباد للطلاب',
    category: 'hostel',
    city: 'Moscow',
    cityAr: 'موسكو',
    address: 'Miklukho-Maklaya St, 18, Moscow',
    nearestMetro: 'Belyaevo / Yugo-Zapadnaya',
    nearestMetroAr: 'بيليايفو / يوغو زابادنايا',
    description:
      'Clean, quiet budget hostel steps away from RUDN University. Shared Halal-friendly kitchen, 24/7 registration support for new students.',
    descriptionAr:
      'هوستيل اقتصادي هادئ على بعد خطوات من جامعة الصداقة RUDN. مطبخ مشترك مناسب للحلال ومساعدة في إجراءات التسجيل للطلاب الجدد.',
    isHalal: true,
    latitude: 55.6512,
    longitude: 37.5015,
    phone: '+7 (495) 433-19-88',
    imageUrl: '/src/assets/images/boutique_hotel_moscow_1794779573111.jpg',
    isActive: true,
    isStarter: true,
    activeOffers: [
      {
        id: 'offer-106',
        placeId: 'place-6',
        title: 'First-Month Student Registration Pack',
        titleAr: 'خصم الشهر الأول للطلاب الجدد',
        description: '15% off weekly and monthly beds for newly arrived university students.',
        descriptionAr: 'خصم ١٥٪ على الإقامة الأسبوعية والشهرية للطلاب القادمين حديثاً.',
        discountPercentage: 15,
        promoCode: 'RUDN15',
        expiresAt: '2026-12-31',
        isActive: true,
      },
    ],
  },
];

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'service-1',
    fullName: 'Tariq Al-Mansoor',
    fullNameAr: 'طارق المنصور',
    category: 'translator',
    city: 'Moscow',
    cityAr: 'موسكو',
    specialty: 'Medical, University Enrollment & Notary Translation',
    specialtyAr: 'ترجمة طبية، تسجيل جامعي، وتوثيق كاتب العدل',
    languagesSpoken: ['Arabic', 'Russian', 'English'],
    languagesSpokenAr: ['العربية', 'الروسية', 'الإنجليزية'],
    phone: '+7 916 555 0142',
    whatsappUrl: 'https://wa.me/79165550142',
    telegramUrl: 'https://t.me/tariq_msk_translator',
    isVerified: true,
    isActive: true,
    isStarter: true,
  },
  {
    id: 'service-2',
    fullName: 'Karim Airport & City Transfer',
    fullNameAr: 'كريم للتوصيل والمطارات',
    category: 'taxi',
    city: 'Moscow',
    cityAr: 'موسكو',
    specialty: 'SVO / DME / VKO Airport Pickup & Family SUVs',
    specialtyAr: 'استقبال مطارات شيريميتيفو ودوموديدوفو وفنوكوفو بسيارات عائلية',
    languagesSpoken: ['Arabic', 'Russian'],
    languagesSpokenAr: ['العربية', 'الروسية'],
    phone: '+7 926 555 0189',
    whatsappUrl: 'https://wa.me/79265550189',
    telegramUrl: 'https://t.me/karim_msk_taxi',
    isVerified: true,
    isActive: true,
    isStarter: true,
  },
  {
    id: 'service-3',
    fullName: 'Layla Al-Hashemi',
    fullNameAr: 'ليلى الهاشمي',
    category: 'translator',
    city: 'Saint Petersburg',
    cityAr: 'سانت بطرسبرغ',
    specialty: 'Business Meetings, Tourism Guiding & Legal Docs',
    specialtyAr: 'مرافقة رجال الأعمال، إرشاد سياحي، وترجمة قانونية',
    languagesSpoken: ['Arabic', 'Russian', 'French'],
    languagesSpokenAr: ['العربية', 'الروسية', 'الفرنسية'],
    phone: '+7 921 555 0114',
    whatsappUrl: 'https://wa.me/79215550114',
    telegramUrl: 'https://t.me/layla_spb_guide',
    isVerified: true,
    isActive: true,
    isStarter: true,
  },
  {
    id: 'service-4',
    fullName: 'Youssef Kazan Express',
    fullNameAr: 'يوسف كازان إكسبرس',
    category: 'taxi',
    city: 'Kazan',
    cityAr: 'كازان',
    specialty: 'Kazan Airport (KZN), Dormitory Move-ins & City Tours',
    specialtyAr: 'مطار كازان، نقل طلاب السكن الجامعي، وجولات المدينة',
    languagesSpoken: ['Arabic', 'Russian', 'Tatar'],
    languagesSpokenAr: ['العربية', 'الروسية', 'التتارية'],
    phone: '+7 987 555 0166',
    whatsappUrl: 'https://wa.me/79875550166',
    telegramUrl: 'https://t.me/youssef_kzn_drive',
    isVerified: true,
    isActive: true,
    isStarter: true,
  },
];

export const TOURIST_SPOTS_DATA: TouristSpot[] = [
  {
    id: 1,
    name: 'Moscow Cathedral Mosque',
    nameAr: 'المسجد الجامع في موسكو',
    city: 'Moscow',
    cityAr: 'موسكو',
    categoryLabel: 'Religious & Cultural',
    categoryLabelAr: 'معلم إسلامي وثقافي',
    openingHours: '08:00 – 21:00 Daily',
    openingHoursAr: 'يومياً 08:00 – 21:00',
    entryFee: 'Free entry',
    entryFeeAr: 'الدخول مجاني',
    nearestMetro: 'Prospekt Mira (Line 5 / 6)',
    nearestMetroAr: 'بروسبيكت ميرا (الخط ٥ / ٦)',
    latitude: 55.7791,
    longitude: 37.6269,
    notes: 'One of Europe’s largest mosques. Halal food stalls and Islamic bookshops surround the courtyard.',
    notesAr: 'أحد أكبر مساجد أوروبا. تحيط به مطاعم حلال ومتاجر إسلامية، ويبعد ٥ دقائق مشياً عن المترو.',
  },
  {
    id: 2,
    name: 'Red Square & Moscow Kremlin',
    nameAr: 'الساحة الحمراء والكرملين',
    city: 'Moscow',
    cityAr: 'موسكو',
    categoryLabel: 'Historic Landmark',
    categoryLabelAr: 'معلم تاريخي',
    openingHours: 'Red Square 24/7 · Kremlin 10:00 – 17:00 (Closed Thu)',
    openingHoursAr: 'الساحة ٢٤ ساعة · الكرملين 10:00 – 17:00 (مغلق الخميس)',
    entryFee: 'Square Free · Kremlin 700–1200 RUB',
    entryFeeAr: 'الساحة مجاناً · الكرملين 700–1200 روبل',
    nearestMetro: 'Okhotny Ryad / Teatralnaya',
    nearestMetroAr: 'أوخوتني رياد / تياترالنايا',
    latitude: 55.7539,
    longitude: 37.6208,
    notes: 'Student discounts available at the Kremlin ticket office with valid ISIC or Russian university card.',
    notesAr: 'تتوفر خصومات للطلاب في شباك التذاكر عند إبراز البطاقة الجامعية الروسية.',
  },
  {
    id: 3,
    name: 'State Hermitage Museum',
    nameAr: 'متحف الإرميتاج الحكومي',
    city: 'Saint Petersburg',
    cityAr: 'سانت بطرسبرغ',
    categoryLabel: 'Museum & Palace',
    categoryLabelAr: 'متحف وقصر تاريخي',
    openingHours: '11:00 – 18:00 (Wed/Fri until 20:00 · Closed Mon)',
    openingHoursAr: '11:00 – 18:00 (الأربعاء والجمعة حتى 20:00 · مغلق الإثنين)',
    entryFee: '500 RUB (Free for students with RU ID)',
    entryFeeAr: '500 روبل (مجاناً لطلاب الجامعات الروسية)',
    nearestMetro: 'Admiralteyskaya',
    nearestMetroAr: 'أدميرالتيسكايا',
    latitude: 59.9398,
    longitude: 30.3146,
    notes: 'Book timed tickets ahead for weekend visits. Audio guides available in Arabic and English.',
    notesAr: 'يُنصح بحجز التذاكر مسبقاً لعطلة نهاية الأسبوع، ويتوفر دليل صوتي داخل القاعات.',
  },
  {
    id: 4,
    name: 'Kul Sharif Mosque (Kazan Kremlin)',
    nameAr: 'مسجد قل شريف — كرملين كازان',
    city: 'Kazan',
    cityAr: 'كازان',
    categoryLabel: 'UNESCO Landmark',
    categoryLabelAr: 'معلم إسلامي وتراثي',
    openingHours: '09:00 – 19:30 Daily',
    openingHoursAr: 'يومياً 09:00 – 19:30',
    entryFee: 'Free entry',
    entryFeeAr: 'الدخول مجاني',
    nearestMetro: 'Kremlyovskaya',
    nearestMetroAr: 'كريمليوفسكايا',
    latitude: 55.7983,
    longitude: 49.1051,
    notes: 'Open prayer halls plus an Islamic Culture Museum on the lower floor. Spectacular evening illumination.',
    notesAr: 'يضم قاعات صلاة مفتوحة ومتحفاً للثقافة الإسلامية في الطابق السفلي مع إضاءة ليلية مميزة.',
  },
];

export const METRO_LINES_DATA: MetroLineGuide[] = [
  {
    id: 'msk-1',
    city: 'Moscow',
    cityAr: 'موسكو',
    lineNumber: 'Line 1',
    lineColorHex: '#D92B2B',
    name: 'Sokolnicheskaya (Red Line)',
    nameAr: 'سوكولنيتشيسكايا (الخط الأحمر)',
    hours: '05:30 – 01:00',
    keyStations: [
      {
        ar: 'كومسومولسكايا',
        en: 'Komsomolskaya',
        ru: 'Комсомольская',
        landmarkAr: 'محطات القطارات الثلاث (لينينغرادسكي / ياروسلافكي)',
        landmarkEn: 'Leningradsky / Yaroslavsky Rail Hub',
      },
      {
        ar: 'أوخوتني رياد',
        en: 'Okhotny Ryad',
        ru: 'Охотный Ряд',
        landmarkAr: 'الساحة الحمراء والكرملين',
        landmarkEn: 'Red Square & Kremlin',
      },
      {
        ar: 'بارك كولتوري',
        en: 'Park Kultury',
        ru: 'Парк культуры',
        landmarkAr: 'حديقة غوركي وتقاطع الخط الدائري',
        landmarkEn: 'Gorky Park & Circle Line Transfer',
      },
      {
        ar: 'يونيفرسيتيت',
        en: 'Universitet',
        ru: 'Университет',
        landmarkAr: 'جامعة موسكو الحكومية MSU',
        landmarkEn: 'Moscow State University (MSU)',
      },
    ],
  },
  {
    id: 'msk-5',
    city: 'Moscow',
    cityAr: 'موسكو',
    lineNumber: 'Line 5',
    lineColorHex: '#8B4513',
    name: 'Koltsevaya (Brown Circle Line)',
    nameAr: 'كولتسيفايا (الخط الدائري البني)',
    hours: '05:30 – 01:00',
    keyStations: [
      {
        ar: 'بروسبيكت ميرا',
        en: 'Prospekt Mira',
        ru: 'Проспект Мира',
        landmarkAr: 'المسجد الجامع في موسكو',
        landmarkEn: 'Moscow Cathedral Mosque',
      },
      {
        ar: 'كورسكايا',
        en: 'Kurskaya',
        ru: 'Курская',
        landmarkAr: 'محطة قطار كورسك ومركز أتريوم',
        landmarkEn: 'Kursky Rail Terminal & Atrium Mall',
      },
      {
        ar: 'بافيليتسكايا',
        en: 'Paveletskaya',
        ru: 'Павелецкая',
        landmarkAr: 'قطار مطار دوموديدوفو Aeroexpress',
        landmarkEn: 'Domodedovo Airport Aeroexpress',
      },
      {
        ar: 'كييفسكايا',
        en: 'Kievskaya',
        ru: 'Киевская',
        landmarkAr: 'قطار مطار فنوكوفو Aeroexpress',
        landmarkEn: 'Vnukovo Airport Aeroexpress',
      },
      {
        ar: 'بيلوروسكايا',
        en: 'Belorusskaya',
        ru: 'Белорусская',
        landmarkAr: 'قطار مطار شيريميتيفو Aeroexpress',
        landmarkEn: 'Sheremetyevo Airport Aeroexpress',
      },
    ],
  },
  {
    id: 'msk-6',
    city: 'Moscow',
    cityAr: 'موسكو',
    lineNumber: 'Line 6',
    lineColorHex: '#EA580C',
    name: 'Kaluzhsko-Rizhskaya (Orange Line)',
    nameAr: 'كالوجسكو-ريجسكايا (الخط البرتقالي)',
    hours: '05:30 – 01:00',
    keyStations: [
      {
        ar: 'فدنخا',
        en: 'VDNKh',
        ru: 'ВДНХ',
        landmarkAr: 'معرض VDNKh ومتحف الفضاء',
        landmarkEn: 'VDNKh Park & Cosmonautics Museum',
      },
      {
        ar: 'بروسبيكت ميرا',
        en: 'Prospekt Mira',
        ru: 'Проспект Мира',
        landmarkAr: 'المسجد الجامع في موسكو والمطاعم الحلال',
        landmarkEn: 'Moscow Cathedral Mosque & Halal Cafes',
      },
      {
        ar: 'كيتاي غورود',
        en: 'Kitay-Gorod',
        ru: 'Китай-город',
        landmarkAr: 'حديقة زاريادي والحي التاريخي',
        landmarkEn: 'Zaryadye Park & Historic Center',
      },
      {
        ar: 'تريتياكوفسكايا',
        en: 'Tretyakovskaya',
        ru: 'Третьяковская',
        landmarkAr: 'معرض تريتياكوف للفنون',
        landmarkEn: 'Tretyakov State Gallery',
      },
      {
        ar: 'بيليايفو',
        en: 'Belyaevo',
        ru: 'Беляево',
        landmarkAr: 'سكن جامعة RUDN للصداقة والمطاعم العربية',
        landmarkEn: 'RUDN University Campus & Halal Dining',
      },
    ],
  },
  {
    id: 'spb-2',
    city: 'Saint Petersburg',
    cityAr: 'سانت بطرسبرغ',
    lineNumber: 'Line 2',
    lineColorHex: '#2563EB',
    name: 'Moskovsko-Petrogradskaya (Blue Line)',
    nameAr: 'موسكوفسكو-بتروغرادسكايا (الخط الأزرق)',
    hours: '05:45 – 00:15',
    keyStations: [
      {
        ar: 'غوركوفسكايا',
        en: 'Gorkovskaya',
        ru: 'Горьковская',
        landmarkAr: 'المسجد الجامع في بطرسبرغ',
        landmarkEn: 'Saint Petersburg Mosque',
      },
      {
        ar: 'نيفسكي بروسبيكت',
        en: 'Nevsky Prospekt',
        ru: 'Невский проспект',
        landmarkAr: 'شارع نيفسكي ومتحف الإرميتاج',
        landmarkEn: 'Nevsky Prospekt & Hermitage Walk',
      },
      {
        ar: 'تيخنولوجيتشيسكي إنستيتوت',
        en: 'Tekhnologichesky Institut',
        ru: 'Технологический институт',
        landmarkAr: 'تقاطع الخط الأحمر والأحياء الطلابية',
        landmarkEn: 'Line 1 Cross-Platform Transfer & Universities',
      },
      {
        ar: 'موسكوفسكايا',
        en: 'Moskovskaya',
        ru: 'Московская',
        landmarkAr: 'حافلات مطار بولكوفو (رقم 39)',
        landmarkEn: 'Pulkovo Airport Bus #39 Connection',
      },
    ],
  },
];
