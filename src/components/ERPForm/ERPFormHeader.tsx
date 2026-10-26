import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Printer, MoreHorizontal, Loader2 } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { ButtonComponent } from '../button/ButtonComponent';
import Tooltip from '@mui/material/Tooltip';

export interface ERPFormMoreMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
}

export interface ERPFormHeaderProps {
  title: string;
  onBack: () => void;
  backTitle?: string;
  statusBadge?: {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'gray' | 'draft' | 'blue';
  };
  extraBadges?: Array<{
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'gray' | 'blue';
  }>;
  customActions?: React.ReactNode;
  onDuplicate?: () => void;
  onPrint?: () => void;
  moreMenuItems?: ERPFormMoreMenuItem[];
  onSave?: () => void;
  isSubmitting?: boolean;
  saveLabel?: string;
  showSave?: boolean;
  dirty?: boolean;
}

export const ERPFormHeader: React.FC<ERPFormHeaderProps> = ({
  title,
  onBack,
  backTitle = 'Back',
  statusBadge,
  extraBadges = [],
  customActions,
  onDuplicate,
  onPrint,
  moreMenuItems = [],
  onSave,
  isSubmitting = false,
  saveLabel = 'Save',
  showSave = true,
  dirty = false,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (showSave && onSave && !isSubmitting) {
          onSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, showSave, isSubmitting]);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowed(el.scrollWidth > el.clientWidth);
    };

    // Check initially and on next frame to ensure layout settles
    checkOverflow();
    const frameId = requestAnimationFrame(checkOverflow);

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [title]);

  const getBadgeStyle = (variant?: string, label?: string) => {
    const v = variant || (label ? String(label).toLowerCase() : 'gray');
    if (v === 'success' || v === 'approved' || v === 'enabled' || v === 'submitted') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (v === 'warning' || v === 'partially received' || v === 'pending') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (v === 'error' || v === 'disabled' || v === 'cancelled' || v === 'draft') {
      return 'bg-red-50 text-red-600 border-red-200';
    }
    if (v === 'blue' || v === 'info') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sticky top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* LEFT SECTION: BACK BUTTON, TITLE, BADGES */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-full">
          <button 
            type="button" 
            onClick={onBack}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={backTitle}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Tooltip 
              title={title} 
              arrow 
              placement="bottom-start" 
              enterDelay={200}
              disableHoverListener={!isOverflowed}
            >
              <h1 
                ref={titleRef}
                className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate cursor-default min-w-0"
              >
                {title}
              </h1>
            </Tooltip>

            {dirty && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs shrink-0">
                Not Saved
              </span>
            )}

            {statusBadge && (
              <div className="shrink-0">
                <StatusBadge status={statusBadge.label} size="sm" />
              </div>
            )}

            {extraBadges.map((badge, idx) => (
              <div key={idx} className="shrink-0">
                <StatusBadge status={badge.label} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SECTION: ACTIONS & SAVE */}
        <div className="flex items-center gap-2 self-end sm:self-auto select-none">
          {customActions}

          {onDuplicate && (
            <ButtonComponent
              variant="secondary"
              onClick={onDuplicate}
            >
              Duplicate
            </ButtonComponent>
          )}

          {onPrint && (
            <ButtonComponent
              variant="secondary"
              onClick={onPrint}
              title="Print"
              sx={{ minWidth: 36, width: 36, p: 0 }}
            >
              <Printer className="w-4 h-4 text-gray-600" />
            </ButtonComponent>
          )}

          {moreMenuItems.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <ButtonComponent
                variant="secondary"
                onClick={() => setShowMoreMenu(prev => !prev)}
                title="More Options"
                sx={{
                  minWidth: 36,
                  width: 36,
                  p: 0,
                  ...(showMoreMenu ? { borderColor: '#059669', backgroundColor: '#ffffff' } : {})
                }}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </ButtonComponent>

              {showMoreMenu && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100">
                  {moreMenuItems.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        item.onClick();
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between font-medium transition-colors ${
                        item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <kbd className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSave && onSave && (
            <ButtonComponent
              variant="primary"
              onClick={onSave}
              loading={isSubmitting}
              loadingText="Saving..."
            >
              {saveLabel}
            </ButtonComponent>
          )}
        </div>

      </div>
    </div>
  );
};

export default ERPFormHeader;
