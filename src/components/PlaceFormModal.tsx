import React, {useEffect, useState} from 'react';
import {Plus, Tag, Trash2, X} from 'lucide-react';
import {
  CITY_COORDS_PRESETS,
  DirectoryCity,
  OfferItem,
  PLACE_CATEGORIES,
  PlaceCategory,
  PlaceItem,
} from '../data/directoryData';
import {
  OfferInput,
  PlaceInput,
  formatFirestoreErrorMessage,
  removeOffer,
  saveOffer,
  savePlace,
} from '../services/directoryService';

interface PlaceFormModalProps {
  isOpen: boolean;
  place: PlaceItem | null;
  existsInFirestore: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onSaved: (message: string) => void;
}

const IMAGE_PRESETS = [
  {
    labelAr: 'صورة مطعم حلال',
    labelEn: 'Halal Restaurant Photo',
    url: '/src/assets/images/halal_restaurant_moscow_1794779573022.jpg',
  },
  {
    labelAr: 'صورة فندق / سكن',
    labelEn: 'Hotel / Hostel Photo',
    url: '/src/assets/images/boutique_hotel_moscow_1794779573111.jpg',
  },
];

export const PlaceFormModal: React.FC<PlaceFormModalProps> = ({
  isOpen,
  place,
  existsInFirestore,
  lang,
  onClose,
  onSaved,
}) => {
  const isAr = lang === 'ar';

  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('restaurant');
  const [city, setCity] = useState<DirectoryCity>('Moscow');
  const [address, setAddress] = useState('');
  const [nearestMetro, setNearestMetro] = useState('');
  const [nearestMetroAr, setNearestMetroAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [isHalal, setIsHalal] = useState(true);
  const [latitude, setLatitude] = useState('55.7558');
  const [longitude, setLongitude] = useState('37.6173');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Offer inline editor state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerTitleAr, setOfferTitleAr] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDescAr, setOfferDescAr] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('15');
  const [offerPromoCode, setOfferPromoCode] = useState('');
  const [offerExpiresAt, setOfferExpiresAt] = useState('2026-12-31');
  const [offerSaving, setOfferSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowOfferForm(false);
    setEditingOffer(null);
    if (place) {
      setName(place.name);
      setNameAr(place.nameAr);
      setCategory(place.category);
      setCity(place.city);
      setAddress(place.address);
      setNearestMetro(place.nearestMetro);
      setNearestMetroAr(place.nearestMetroAr);
      setDescription(place.description);
      setDescriptionAr(place.descriptionAr);
      setIsHalal(place.isHalal);
      setLatitude(String(place.latitude));
      setLongitude(String(place.longitude));
      setPhone(place.phone);
      const initialUrl = place.imageUrl || IMAGE_PRESETS[0].url;
      setImageUrl(initialUrl);
      setUseCustomImage(!IMAGE_PRESETS.some((p) => p.url === initialUrl));
      setIsActive(place.isActive);
    } else {
      setName('');
      setNameAr('');
      setCategory('restaurant');
      setCity('Moscow');
      setAddress('');
      setNearestMetro('');
      setNearestMetroAr('');
      setDescription('');
      setDescriptionAr('');
      setIsHalal(true);
      setLatitude('55.7558');
      setLongitude('37.6173');
      setPhone('+7 ');
      setImageUrl(IMAGE_PRESETS[0].url);
      setUseCustomImage(false);
      setIsActive(true);
    }
  }, [isOpen, place]);

  if (!isOpen) return null;

  const handleCityPresetCoords = () => {
    const preset = CITY_COORDS_PRESETS[city];
    setLatitude(String(preset.lat));
    setLongitude(String(preset.lon));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const latNum = Number(latitude);
    const lonNum = Number(longitude);

    if (name.trim().length < 2 || nameAr.trim().length < 2) {
      setError(
        isAr
          ? 'يرجى إدخال الاسم بالعربية والإنجليزية (حرفان على الأقل).'
          : 'Please enter both English and Arabic names (min 2 chars).',
      );
      return;
    }
    if (address.trim().length < 3 || nearestMetro.trim().length < 2 || nearestMetroAr.trim().length < 2) {
      setError(
        isAr
          ? 'يرجى إدخال العنوان وأقرب محطة مترو بالعربية والإنجليزية.'
          : 'Please fill address and nearest Metro in both languages.',
      );
      return;
    }
    if (description.trim().length < 5 || descriptionAr.trim().length < 5) {
      setError(
        isAr
          ? 'يرجى إدخال وصف لا يقل عن ٥ أحرف بالعربية والإنجليزية.'
          : 'Please provide descriptions (min 5 chars) in both languages.',
      );
      return;
    }
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90 || Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError(
        isAr
          ? 'إحداثيات خط العرض أو الطول غير صالحة.'
          : 'Latitude (-90..90) or Longitude (-180..180) is invalid.',
      );
      return;
    }
    if (phone.trim().length < 5) {
      setError(isAr ? 'رقم الهاتف قصير جداً.' : 'Phone number must be at least 5 characters.');
      return;
    }

    const payload: PlaceInput = {
      id: place?.id,
      name,
      nameAr,
      category,
      city,
      address,
      nearestMetro,
      nearestMetroAr,
      description,
      descriptionAr,
      isHalal,
      latitude: latNum,
      longitude: lonNum,
      phone,
      imageUrl,
      isActive,
    };

    setSaving(true);
    try {
      await savePlace(payload, Boolean(place && existsInFirestore));
      onSaved(
        place
          ? isAr
            ? 'تم تحديث بيانات المكان بنجاح.'
            : 'Place updated successfully.'
          : isAr
            ? 'تمت إضافة المكان الجديد بنجاح.'
            : 'New place added successfully.',
      );
      onClose();
    } catch (err) {
      setError(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setSaving(false);
    }
  };

  const openNewOffer = () => {
    setEditingOffer(null);
    setOfferTitle('');
    setOfferTitleAr('');
    setOfferDesc('');
    setOfferDescAr('');
    setOfferDiscount('15');
    setOfferPromoCode('ARAB15');
    setOfferExpiresAt('2026-12-31');
    setShowOfferForm(true);
  };

  const openEditOffer = (offer: OfferItem) => {
    setEditingOffer(offer);
    setOfferTitle(offer.title);
    setOfferTitleAr(offer.titleAr);
    setOfferDesc(offer.description);
    setOfferDescAr(offer.descriptionAr);
    setOfferDiscount(String(offer.discountPercentage));
    setOfferPromoCode(offer.promoCode);
    setOfferExpiresAt(offer.expiresAt);
    setShowOfferForm(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place || !existsInFirestore) return;
    setError(null);

    if (offerTitle.trim().length < 3 || offerTitleAr.trim().length < 3) {
      setError(
        isAr
          ? 'عنوان العرض يجب أن يكون ٣ أحرف على الأقل بالعربية والإنجليزية.'
          : 'Offer title must be at least 3 chars in both languages.',
      );
      return;
    }
    if (offerDesc.trim().length < 5 || offerDescAr.trim().length < 5) {
      setError(
        isAr
          ? 'تفاصيل العرض يجب أن تكون ٥ أحرف على الأقل بالعربية والإنجليزية.'
          : 'Offer description must be at least 5 chars in both languages.',
      );
      return;
    }
    const disc = Math.round(Number(offerDiscount));
    if (Number.isNaN(disc) || disc < 1 || disc > 100) {
      setError(isAr ? 'نسبة الخصم يجب أن تكون بين 1 و 100.' : 'Discount must be 1–100%.');
      return;
    }
    if (offerPromoCode.trim().length < 2) {
      setError(
        isAr
          ? 'كود الخصم يجب أن يكون حرفين على الأقل.'
          : 'Promo code must be at least 2 characters.',
      );
      return;
    }
    if (offerExpiresAt.trim().length < 8) {
      setError(isAr ? 'يرجى تحديد تاريخ انتهاء صالح.' : 'Please pick a valid expiration date.');
      return;
    }

    const payload: OfferInput = {
      id: editingOffer?.id,
      placeId: place.id,
      title: offerTitle,
      titleAr: offerTitleAr,
      description: offerDesc,
      descriptionAr: offerDescAr,
      discountPercentage: disc,
      promoCode: offerPromoCode,
      expiresAt: offerExpiresAt,
      isActive: true,
    };

    setOfferSaving(true);
    try {
      await saveOffer(payload, Boolean(editingOffer));
      setShowOfferForm(false);
      onSaved(isAr ? 'تم حفظ العرض الترويجي.' : 'Promotional offer saved.');
    } catch (err) {
      setError(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setOfferSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!place || !existsInFirestore) return;
    setOfferSaving(true);
    try {
      await removeOffer(place.id, offerId);
      onSaved(isAr ? 'تم حذف العرض.' : 'Offer deleted.');
    } catch (err) {
      setError(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setOfferSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">
            {place
              ? isAr
                ? 'تعديل بيانات المكان'
                : 'Edit Place Listing'
              : isAr
                ? 'إضافة مكان جديد (مطعم / فندق / هوستيل)'
                : 'Add New Place Listing'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الاسم بالعربية *' : 'Arabic Name *'}
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                placeholder="مطعم سمرقند التراثي"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الاسم بالإنجليزية *' : 'English Name *'}
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                placeholder="Samarkand Heritage Grill"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'التصنيف *' : 'Category *'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlaceCategory)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {PLACE_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {isAr ? cat.ar : cat.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'المدينة *' : 'City *'}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as DirectoryCity)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                <option value="Moscow">{isAr ? 'موسكو (Moscow)' : 'Moscow'}</option>
                <option value="Saint Petersburg">
                  {isAr ? 'سانت بطرسبرغ (Saint Petersburg)' : 'Saint Petersburg'}
                </option>
                <option value="Kazan">{isAr ? 'كازان (Kazan)' : 'Kazan'}</option>
                <option value="Sochi">{isAr ? 'سوتشي (Sochi)' : 'Sochi'}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'العنوان الكامل *' : 'Street Address *'}
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                placeholder="Prospekt Mira, 109, Moscow"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'أقرب مترو (بالعربية) *' : 'Nearest Metro (Arabic) *'}
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={nearestMetroAr}
                onChange={(e) => setNearestMetroAr(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                placeholder="فدنخا"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'أقرب مترو (بالإنجليزية) *' : 'Nearest Metro (English) *'}
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={nearestMetro}
                onChange={(e) => setNearestMetro(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                placeholder="VDNKh"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الوصف بالعربية *' : 'Arabic Description *'}
              </label>
              <textarea
                required
                rows={2}
                maxLength={1500}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الوصف بالإنجليزية *' : 'English Description *'}
              </label>
              <textarea
                required
                rows={2}
                maxLength={1500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                dir="ltr"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  {isAr ? 'خط العرض (Latitude) *' : 'Latitude *'}
                </label>
                <button
                  type="button"
                  onClick={handleCityPresetCoords}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  {isAr ? 'إحداثيات المدينة' : 'City Center'}
                </button>
              </div>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                dir="ltr"
                className="font-mono-tabular mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'خط الطول (Longitude) *' : 'Longitude *'}
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                dir="ltr"
                className="font-mono-tabular mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="font-mono-tabular mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'صورة العرض' : 'Cover Image'}
              </label>
              <select
                value={useCustomImage ? 'custom' : imageUrl}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setUseCustomImage(true);
                    if (IMAGE_PRESETS.some((p) => p.url === imageUrl)) {
                      setImageUrl('');
                    }
                  } else {
                    setUseCustomImage(false);
                    setImageUrl(e.target.value);
                  }
                }}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {IMAGE_PRESETS.map((p) => (
                  <option key={p.url} value={p.url}>
                    {isAr ? p.labelAr : p.labelEn}
                  </option>
                ))}
                <option value="custom">{isAr ? 'رابط مخصص' : 'Custom URL'}</option>
              </select>
            </div>

            {useCustomImage && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  {isAr ? 'رابط الصورة المخصص' : 'Custom Image URL'}
                </label>
                <input
                  type="url"
                  maxLength={500}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  dir="ltr"
                  placeholder="https://example.com/photo.jpg"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isHalal}
                  onChange={(e) => setIsHalal(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span>{isAr ? 'معتمد حلال (Halal)' : 'Halal Certified'}</span>
              </label>

              <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span>{isAr ? 'منشور في الدليل' : 'Published in Directory'}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving
                ? isAr
                  ? 'جارٍ الحفظ...'
                  : 'Saving...'
                : isAr
                  ? 'حفظ المكان'
                  : 'Save Place'}
            </button>
          </div>
        </form>

        {/* Promotional Offers Manager for Saved Firestore Places */}
        {place && existsInFirestore && (
          <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Tag className="h-4 w-4 text-amber-700" />
                <span>
                  {isAr ? 'العروض والخصومات المرتبطة' : 'Promotional Offers'}
                </span>
              </h3>
              <button
                type="button"
                onClick={openNewOffer}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إضافة عرض' : 'Add Offer'}</span>
              </button>
            </div>

            {place.activeOffers.length === 0 && !showOfferForm && (
              <p className="mt-3 text-xs text-slate-500">
                {isAr
                  ? 'لا توجد عروض مسجلة لهذا المكان بعد.'
                  : 'No promotional offers attached to this place yet.'}
              </p>
            )}

            <div className="mt-3 space-y-2.5">
              {place.activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {isAr ? offer.titleAr : offer.title}
                    </p>
                    <p className="mt-0.5 font-mono-tabular text-xs text-slate-500">
                      -{offer.discountPercentage}% · {offer.promoCode} · {offer.expiresAt}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditOffer(offer)}
                      className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isAr ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      disabled={offerSaving}
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      aria-label={isAr ? 'حذف العرض' : 'Delete offer'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {showOfferForm && (
              <form
                onSubmit={handleSaveOffer}
                className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-white p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'عنوان العرض (عربي) *' : 'Offer Title (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={offerTitleAr}
                      onChange={(e) => setOfferTitleAr(e.target.value)}
                      className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'عنوان العرض (إنجليزي) *' : 'Offer Title (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      dir="ltr"
                      className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'تفاصيل العرض (عربي) *' : 'Description (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={1000}
                      value={offerDescAr}
                      onChange={(e) => setOfferDescAr(e.target.value)}
                      className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'تفاصيل العرض (إنجليزي) *' : 'Description (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={1000}
                      value={offerDesc}
                      onChange={(e) => setOfferDesc(e.target.value)}
                      dir="ltr"
                      className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'نسبة الخصم % *' : 'Discount % *'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={offerDiscount}
                      onChange={(e) => setOfferDiscount(e.target.value)}
                      className="font-mono-tabular mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'كود الخصم *' : 'Promo Code *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={32}
                      value={offerPromoCode}
                      onChange={(e) => setOfferPromoCode(e.target.value)}
                      dir="ltr"
                      className="font-mono-tabular mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {isAr ? 'تاريخ الانتهاء *' : 'Expires At *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={offerExpiresAt}
                      onChange={(e) => setOfferExpiresAt(e.target.value)}
                      dir="ltr"
                      className="font-mono-tabular mt-1 min-h-[38px] w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferForm(false)}
                    className="min-h-[38px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={offerSaving}
                    className="min-h-[38px] rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    {offerSaving
                      ? isAr
                        ? 'جارٍ الحفظ...'
                        : 'Saving...'
                      : isAr
                        ? 'حفظ العرض'
                        : 'Save Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
