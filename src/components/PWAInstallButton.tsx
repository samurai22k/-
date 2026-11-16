import React, {useState} from 'react';
import {Download, Share, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  lang: 'ar' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({lang}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 whitespace-nowrap shrink-0"
        >
          <Share className="h-4 w-4 shrink-0" />
          <span>{lang === 'ar' ? 'تثبيت على iOS' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-xs sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold">
                  {lang === 'ar'
                    ? 'التثبيت على iPhone و iPad'
                    : 'Install on iPhone & iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <li>
                  {lang === 'ar'
                    ? '١. اضغط على زر المشاركة (Share) في شريط Safari السفلي.'
                    : '1. Tap the Share button in the Safari browser toolbar.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? '٢. مرّر للأسفل واختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).'
                    : '2. Scroll down and tap Add to Home Screen.'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {lang === 'ar' ? 'حسناً' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
