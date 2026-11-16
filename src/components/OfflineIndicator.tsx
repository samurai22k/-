import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  lang: 'ar' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({lang}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-18 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 shadow-lg md:bottom-5 md:left-5 md:right-auto"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-700" />
      <span>
        {lang === 'ar'
          ? 'وضع عدم الاتصال — يتم عرض البيانات المحفوظة محلياً'
          : 'Offline Mode — Showing locally cached directory data'}
      </span>
    </div>
  );
};
