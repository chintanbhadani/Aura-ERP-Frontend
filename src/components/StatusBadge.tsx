import React from 'react';

export interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  title?: string;
}

const getStatusConfig = (statusStr: string) => {
  const normalized = (statusStr || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');

  switch (normalized) {
    case 'submitted':
    case 'approved':
    case 'enabled':
    case 'active':
    case 'completed':
    case 'paid':
    case 'verified':
      return {
        bg: 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-700 border-emerald-200/90',
        dot: 'bg-emerald-500',
        pulseColor: 'bg-emerald-400',
      };

    case 'in_production':
    case 'in_progress':
    case 'processing':
    case 'ordered':
      return {
        bg: 'bg-blue-50 hover:bg-blue-100/90 text-blue-700 border-blue-200/90',
        dot: 'bg-blue-500',
        pulseColor: 'bg-blue-400',
        defaultPulse: true,
      };

    case 'draft':
    case 'pending':
    case 'under_review':
    case 'partially_received':
      return {
        bg: 'bg-amber-50 hover:bg-amber-100/90 text-amber-700 border-amber-200/90',
        dot: 'bg-amber-500',
        pulseColor: 'bg-amber-400',
      };

    case 'dispatched':
    case 'shipped':
    case 'sent':
      return {
        bg: 'bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border-indigo-200/90',
        dot: 'bg-indigo-500',
        pulseColor: 'bg-indigo-400',
      };

    case 'disabled':
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'unpaid':
    case 'overdue':
      return {
        bg: 'bg-rose-50 hover:bg-rose-100/90 text-rose-700 border-rose-200/90',
        dot: 'bg-rose-500',
        pulseColor: 'bg-rose-400',
      };

    default:
      return {
        bg: 'bg-gray-100 hover:bg-gray-200/90 text-gray-700 border-gray-300/80',
        dot: 'bg-gray-400',
        pulseColor: 'bg-gray-300',
      };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showDot = true,
  pulse,
  className = '',
  onClick,
  title,
}) => {
  const config = getStatusConfig(status);
  const shouldPulse = pulse ?? config.defaultPulse ?? false;

  const sizeClasses = {
    xs: 'px-2.5 py-0.5 text-xs font-semibold gap-1.5',
    sm: 'px-3 py-1 text-xs sm:text-sm font-bold gap-1.5',
    md: 'px-3.5 py-1.5 text-sm font-bold gap-2',
    lg: 'px-4 py-2 text-base font-extrabold gap-2.5',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  }[size];

  return (
    <span
      onClick={onClick}
      title={title || `Status: ${status}`}
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide shadow-2xs select-none transition-all ${config.bg} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''
      } ${className}`}
    >
      {showDot && (
        <span className="relative flex items-center justify-center shrink-0">
          {shouldPulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.pulseColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${config.dot} ${dotSize}`} />
        </span>
      )}
      <span>{status || 'Draft'}</span>
    </span>
  );
};
