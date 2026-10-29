import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { DashboardLayout } from './DashboardLayout';

export interface Breadcrumb {
  label: string;
  path?: string;
}

export interface FormPageLayoutProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  metadata?: {
    createdBy?: string;
    createdAt?: string;
    lastEditedBy?: string;
    lastEditedAt?: string;
  };
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
}

export const FormPageLayout: React.FC<FormPageLayoutProps> = ({
  title,
  breadcrumbs,
  children,
  onSave,
  onCancel,
  isSubmitting = false,
  isDirty = false
}) => {
  return (
    <DashboardLayout>
      <div className="p-3 lg:p-4 space-y-4 w-full flex flex-col h-full bg-gray-50/30 font-sans overflow-y-auto">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500 mb-1.5">
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={idx}>
                    {bc.path ? (
                      <Link to={bc.path} className="hover:text-primary-600 transition-colors">
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{bc.label}</span>
                    )}
                    {idx < breadcrumbs.length - 1 && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
              {isDirty && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                  Not Saved
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                size="sm"
              >
                Cancel
              </Button>
            )}
            {onSave && (
              <Button 
                variant="primary" 
                onClick={onSave}
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
          {/* Form Content */}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
