import React, {useEffect, useRef, useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import {PLACE_CATEGORIES, PlaceItem} from '../data/directoryData';
import {SafeImage} from './SafeImage';

interface PlaceDetailSheetProps {
  place: PlaceItem | null;
  lang: 'ar' | 'en';
  onClose: () => void;
}

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({
  place,
  lang,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setShowQrModal(false);
    setCopiedShareUrl(false);
    setCopiedCoords(false);
    setCopiedCode(null);
  }, [place?.id]);

  if (!place) return null;

  const isAr = lang === 'ar';
  const coordsString = `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
  const catMeta = PLACE_CATEGORIES.find((c) => c.key === place.category);
  const shareUrl = `${window.location.origin}/?tab=places&place=${encodeURIComponent(place.id)}`;

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(coordsString);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleCopyPromo = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleDownloadQrSvg = () => {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${place.id}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto my-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="relative h-52 w-full overflow-hidden bg-slate-100">
          <SafeImage
            src={place.imageUrl}
            alt={isAr ? place.nameAr : place.name}
            fallbackType={place.category}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 end-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-sm transition-colors hover:bg-slate-950"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>{isAr ? place.cityAr : place.city}</span>
                <span aria-hidden="true">·</span>
                <span>{isAr ? catMeta?.ar ?? place.category : catMeta?.en ?? place.category}</span>
                {place.isHalal && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {isAr ? 'حلال معتمد' : 'Halal Verified'}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
              >
                <QrCode className="h-4 w-4 text-emerald-700" />
                <span>{isAr ? 'مشاركة QR' : 'Share QR'}</span>
              </button>
            </div>

            <h2 className="mt-1.5 text-xl font-bold text-slate-900">
              {isAr ? place.nameAr : place.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isAr ? place.descriptionAr : place.description}
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100 text-sm">
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-medium text-slate-900">{place.address}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isAr ? 'أقرب مترو:' : 'Nearest Metro:'}{' '}
                    {isAr ? place.nearestMetroAr : place.nearestMetro}
                  </p>
                  <p className="font-mono-tabular mt-1 text-xs text-slate-500">
                    {coordsString}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {copiedCoords ? (
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>
                  {copiedCoords
                    ? isAr
                      ? 'تم النسخ'
                      : 'Copied'
                    : isAr
                      ? 'نسخ الإحداثيات'
                      : 'Copy GPS'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="font-mono-tabular font-medium" dir="ltr">
                  {place.phone}
                </span>
              </div>
              <a
                href={`tel:${place.phone.replace(/[^+\d]/g, '')}`}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                {isAr ? 'اتصال مباشر' : 'Call'}
              </a>
            </div>
          </div>

          {place.activeOffers.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Tag className="h-4 w-4 text-amber-700" />
                <span>{isAr ? 'العروض النشطة حالياً' : 'Active Offers'}</span>
              </h3>
              {place.activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-bold text-slate-900">
                      {isAr ? offer.titleAr : offer.title}
                    </h4>
                    <span className="font-mono-tabular shrink-0 text-sm font-bold text-amber-800">
                      -{offer.discountPercentage}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {isAr ? offer.descriptionAr : offer.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-amber-200/80 pt-3 text-xs">
                    <span className="text-slate-600">
                      {isAr ? 'ينتهي في' : 'Valid until'}{' '}
                      <span className="font-mono-tabular font-medium">
                        {offer.expiresAt}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPromo(offer.promoCode)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-mono-tabular text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      {copiedCode === offer.promoCode ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{offer.promoCode}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <a
              href={`https://yandex.com/maps/?pt=${place.longitude},${place.latitude}&z=16&l=map`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              <span>{isAr ? 'خرائط ياندكس' : 'Yandex Maps'}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={`https://maps.google.com/?q=${place.latitude},${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <span>{isAr ? 'خرائط جوجل' : 'Google Maps'}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Share QR Code Nested Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={(e) => {
            e.stopPropagation();
            setShowQrModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'مشاركة رمز الاستجابة السريعة' : 'Share QR Code'}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? 'مشاركة عبر رمز QR' : 'Share Location QR Code'}
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-start text-xs text-slate-500">
              {isAr
                ? 'امسح الرمز بكاميرا الهاتف لفتح صفحة هذا المكان مباشرة:'
                : 'Scan with any phone camera to open this listing directly:'}
            </p>

            <div
              ref={qrContainerRef}
              className="mx-auto mt-4 inline-flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4"
            >
              <QRCodeSVG
                value={shareUrl}
                size={200}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0F172A"
              />
              <p className="mt-3 text-sm font-bold text-slate-900">
                {isAr ? place.nameAr : place.name}
              </p>
              <p className="text-xs text-slate-500">
                {isAr ? place.cityAr : place.city} ·{' '}
                {isAr ? place.nearestMetroAr : place.nearestMetro}
              </p>
            </div>

            <div
              dir="ltr"
              className="font-mono-tabular mt-4 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600"
            >
              {shareUrl}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                {copiedShareUrl ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>
                  {copiedShareUrl
                    ? isAr
                      ? 'تم نسخ الرابط'
                      : 'Link Copied'
                    : isAr
                      ? 'نسخ الرابط'
                      : 'Copy Link'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrSvg}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                <span>{isAr ? 'حفظ QR' : 'Save SVG'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
