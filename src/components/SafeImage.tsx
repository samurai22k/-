import React, {useState} from 'react';
import {BedDouble, Building2, Coffee, Compass, ShoppingBag, Store, Utensils} from 'lucide-react';
import {PlaceCategory} from '../data/directoryData';

interface SafeImageProps {
  src: string;
  alt: string;
  fallbackType?: PlaceCategory | 'metro';
  className?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackType = 'restaurant',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    const Icon =
      fallbackType === 'hotel'
        ? Building2
        : fallbackType === 'hostel'
          ? BedDouble
          : fallbackType === 'cafe'
            ? Coffee
            : fallbackType === 'grocery'
              ? ShoppingBag
              : fallbackType === 'other'
                ? Store
                : fallbackType === 'metro'
                  ? Compass
                  : Utensils;

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Icon className="h-8 w-8 text-emerald-700/70" />
        <span className="mt-2 max-w-[80%] truncate px-3 text-xs font-medium text-slate-600">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
};
