import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating?: number;
  maxStars?: number;
  onChange?: (rating: number) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPrimeBadge?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const getRatingLabel = (stars: number): { label: string; isPrime: boolean; color: string } => {
  switch (stars) {
    case 5:
      return { label: '5★ Prime Customer (Tier 1)', isPrime: true, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 4:
      return { label: '4★ Prime Customer (Tier 2)', isPrime: true, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    case 3:
      return { label: '3★ Standard Customer', isPrime: false, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 2:
      return { label: '2★ Moderate Follow-up', isPrime: false, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    case 1:
      return { label: '1★ High Risk / Defaulter', isPrime: false, color: 'text-rose-600 bg-rose-50 border-rose-200' };
    default:
      return { label: '0★ Unclassified', isPrime: false, color: 'text-slate-400 bg-slate-50 border-slate-200' };
  }
};

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  maxStars = 5,
  onChange,
  size = 'sm',
  showLabel = false,
  showPrimeBadge = false,
  readOnly = false,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const currentDisplay = hoverRating !== null ? hoverRating : (rating || 0);
  const ratingInfo = getRatingLabel(rating || 0);
  const isInteractive = !readOnly && Boolean(onChange);

  const handleStarClick = (starIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInteractive || !onChange) return;
    // Clicking the same star rating sets it to 0 (toggle off), or clicks star
    const newRating = rating === starIndex ? 0 : starIndex;
    onChange(newRating);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className={`inline-flex items-center gap-0.5 ${isInteractive ? 'cursor-pointer select-none' : ''}`}
        onMouseLeave={() => isInteractive && setHoverRating(null)}
        title={isInteractive ? `Click star to classify customer (0 to 5 stars). Current: ${rating}★` : `${rating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].slice(0, maxStars).map((starVal) => {
          const isFilled = starVal <= currentDisplay;
          return (
            <button
              key={starVal}
              type="button"
              disabled={!isInteractive}
              onClick={(e) => handleStarClick(starVal, e)}
              onMouseEnter={() => isInteractive && setHoverRating(starVal)}
              className={`p-0.5 rounded transition-transform ${
                isInteractive ? 'hover:scale-125 focus:outline-none cursor-pointer' : 'cursor-default'
              }`}
              aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
            >
              <Star
                className={`${starSizes[size]} transition-colors ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                    : 'text-slate-300 fill-slate-100 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Quick 0-star button when interactive */}
      {isInteractive && rating > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(0);
          }}
          title="Reset to 0 Stars"
          className="text-[10px] px-1 py-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
        >
          0★
        </button>
      )}

      {/* Prime Customer Tag Badge */}
      {showPrimeBadge && rating >= 4 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap animate-in fade-in">
          <span>🌟</span>
          <span>Prime Customer</span>
        </span>
      )}

      {/* Descriptive Label */}
      {showLabel && (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${ratingInfo.color} whitespace-nowrap`}
        >
          {ratingInfo.label}
        </span>
      )}
    </div>
  );
};
