import React, {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {
  DirectoryCity,
  SERVICE_CATEGORIES,
  ServiceCategory,
  ServiceItem,
} from '../data/directoryData';
import {
  ServiceInput,
  formatFirestoreErrorMessage,
  saveService,
} from '../services/directoryService';

interface ServiceFormModalProps {
  isOpen: boolean;
  service: ServiceItem | null;
  existsInFirestore: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  service,
  existsInFirestore,
  lang,
  onClose,
  onSaved,
}) => {
  const isAr = lang === 'ar';

  const [fullName, setFullName] = useState('');
  const [fullNameAr, setFullNameAr] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('translator');
  const [city, setCity] = useState<DirectoryCity>('Moscow');
  const [specialty, setSpecialty] = useState('');
  const [specialtyAr, setSpecialtyAr] = useState('');
  const [languagesText, setLanguagesText] = useState('Arabic, Russian');
  const [languagesTextAr, setLanguagesTextAr] = useState('العربية، الروسية');
  const [phone, setPhone] = useState('+7 ');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (service) {
      setFullName(service.fullName);
      setFullNameAr(service.fullNameAr);
      setCategory(service.category);
      setCity(service.city);
      setSpecialty(service.specialty);
      setSpecialtyAr(service.specialtyAr);
      setLanguagesText(service.languagesSpoken.join(', '));
      setLanguagesTextAr(service.languagesSpokenAr.join('، '));
      setPhone(service.phone);
      setWhatsappUrl(service.whatsappUrl);
      setTelegramUrl(service.telegramUrl);
      setIsVerified(service.isVerified);
      setIsActive(service.isActive);
    } else {
      setFullName('');
      setFullNameAr('');
      setCategory('translator');
      setCity('Moscow');
      setSpecialty('');
      setSpecialtyAr('');
      setLanguagesText('Arabic, Russian');
      setLanguagesTextAr('العربية، الروسية');
      setPhone('+7 ');
      setWhatsappUrl('https://wa.me/');
      setTelegramUrl('https://t.me/');
      setIsVerified(true);
      setIsActive(true);
    }
  }, [isOpen, service]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2 || fullNameAr.trim().length < 2) {
      setError(
        isAr
          ? 'يرجى إدخال الاسم بالعربية والإنجليزية.'
          : 'Please enter provider name in Arabic and English.',
      );
      return;
    }
    if (specialty.trim().length < 3 || specialtyAr.trim().length < 3) {
      setError(
        isAr
          ? 'يرجى إدخال التخصص بالعربية والإنجليزية.'
          : 'Please enter specialty in both languages.',
      );
      return;
    }
    if (phone.trim().length < 5) {
      setError(isAr ? 'رقم الهاتف غير صالح.' : 'Phone number must be at least 5 characters.');
      return;
    }

    const langs = languagesText
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const langsAr = languagesTextAr
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (langs.length === 0 || langsAr.length === 0) {
      setError(
        isAr ? 'يرجى إدخال لغة واحدة على الأقل.' : 'Please specify at least one language.',
      );
      return;
    }

    const payload: ServiceInput = {
      id: service?.id,
      fullName,
      fullNameAr,
      category,
      city,
      specialty,
      specialtyAr,
      languagesSpoken: langs,
      languagesSpokenAr: langsAr,
      phone,
      whatsappUrl,
      telegramUrl,
      isVerified,
      isActive,
    };

    setSaving(true);
    try {
      await saveService(payload, Boolean(service && existsInFirestore));
      onSaved(
        service
          ? isAr
            ? 'تم تحديث بيانات الخدمة بنجاح.'
            : 'Service updated successfully.'
          : isAr
            ? 'تمت إضافة الخدمة الجديدة بنجاح.'
            : 'New service added successfully.',
      );
      onClose();
    } catch (err) {
      setError(formatFirestoreErrorMessage(err, isAr));
    } finally {
      setSaving(false);
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
            {service
              ? isAr
                ? 'تعديل بيانات الخدمة'
                : 'Edit Service Listing'
              : isAr
                ? 'إضافة خدمة جديدة'
                : 'Add New Service Listing'}
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
                maxLength={140}
                value={fullNameAr}
                onChange={(e) => setFullNameAr(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'الاسم بالإنجليزية *' : 'English Name *'}
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'نوع الخدمة *' : 'Service Category *'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              >
                {SERVICE_CATEGORIES.map((cat) => (
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
                {isAr ? 'التخصص بالعربية *' : 'Specialty (Arabic) *'}
              </label>
              <input
                type="text"
                required
                maxLength={240}
                value={specialtyAr}
                onChange={(e) => setSpecialtyAr(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'التخصص بالإنجليزية *' : 'Specialty (English) *'}
              </label>
              <input
                type="text"
                required
                maxLength={240}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'اللغات (عربي، مفصولة بفاصلة) *' : 'Languages (Arabic, comma-separated) *'}
              </label>
              <input
                type="text"
                required
                value={languagesTextAr}
                onChange={(e) => setLanguagesTextAr(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'اللغات (إنجليزي، مفصولة بفاصلة) *' : 'Languages (English, comma-separated) *'}
              </label>
              <input
                type="text"
                required
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                dir="ltr"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'رقم الهاتف *' : 'Phone *'}
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
                {isAr ? 'رابط واتساب' : 'WhatsApp URL'}
              </label>
              <input
                type="url"
                maxLength={255}
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                dir="ltr"
                placeholder="https://wa.me/7916..."
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                {isAr ? 'رابط تيليجرام' : 'Telegram URL'}
              </label>
              <input
                type="url"
                maxLength={255}
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                dir="ltr"
                placeholder="https://t.me/username"
                className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span>{isAr ? 'مزود خدمة موثق' : 'Verified Provider'}</span>
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
                  ? 'حفظ الخدمة'
                  : 'Save Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
