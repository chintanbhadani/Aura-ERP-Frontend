import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        document.documentElement.classList.contains('dark')
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextDark = !isDark;

    // Use Modern View Transitions API with circular clip-path ripple if supported!
    if ('startViewTransition' in document) {
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
        setIsDark(nextDark);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 550,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      // Fallback
      setIsDark(nextDark);
    }
  };

  const btnSizes = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSizes = size === 'sm' ? 16 : 18;

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-gray-700 dark:text-emerald-300 transition-colors cursor-pointer select-none border border-gray-200/80 dark:border-emerald-800/40 shadow-xs ${btnSizes} ${className}`}
    >
      <span className="sr-only">Toggle theme</span>
      <div className="relative w-full h-full flex items-center justify-center">
        {isDark ? (
          <Sun size={iconSizes} className="transition-transform duration-300 rotate-0 scale-100 text-amber-400" />
        ) : (
          <Moon size={iconSizes} className="transition-transform duration-300 rotate-0 scale-100 text-gray-700" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
