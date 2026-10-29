import React from 'react';
import { motion } from 'framer-motion';

export interface TabOption {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ElementType;
}

interface PillTabsProps {
  tabs: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  variant?: 'dark' | 'emerald' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
}

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  activeId,
  onChange,
  layoutId = 'active-pill-tab',
  variant = 'dark',
  size = 'md',
  className = '',
}) => {
  const containerStyles =
    variant === 'subtle'
      ? 'bg-gray-100/80 border border-gray-200/60'
      : 'bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/5';

  const pillStyles = {
    dark: 'bg-gray-900 text-white shadow-sm',
    emerald: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20',
    subtle: 'bg-white text-gray-900 shadow-sm border border-gray-200/80',
  }[variant];

  const activeTextStyles = {
    dark: 'text-white font-medium',
    emerald: 'text-white font-medium',
    subtle: 'text-gray-900 font-bold',
  }[variant];

  const inactiveTextStyles = {
    dark: 'text-gray-600 hover:text-gray-900',
    emerald: 'text-gray-600 hover:text-emerald-700',
    subtle: 'text-gray-500 hover:text-gray-900 font-medium',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs py-1 px-3 gap-1.5',
    md: 'text-xs sm:text-sm py-1.5 px-4 gap-2',
  }[size];

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-full ${containerStyles} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center rounded-full transition-colors cursor-pointer select-none ${sizeStyles} ${
              isActive ? activeTextStyles : inactiveTextStyles
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                }}
                className={`absolute inset-0 rounded-full ${pillStyles} z-0`}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full transition-colors ${
                    isActive
                      ? variant === 'subtle'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-white/20 text-white'
                      : 'bg-gray-200/80 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PillTabs;
