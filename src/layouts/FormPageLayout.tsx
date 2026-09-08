import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, User } from 'lucide-react';
import { Button } from '@mui/material';

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
}

export const FormPageLayout: React.FC<FormPageLayoutProps> = ({
  title,
  breadcrumbs,
  children,
  onSave,
  onCancel,
  isSubmitting = false
}) => {
  return (
    <div className="w-full pb-12 flex justify-center">
      {/* Main Content Area */}
      <div className="w-full max-w-5xl min-w-0">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={idx}>
                    {bc.path ? (
                      <Link to={bc.path} className="hover:text-primary transition-colors">
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{bc.label}</span>
                    )}
                    {idx < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button 
                variant="text" 
                color="inherit" 
                onClick={onCancel}
                sx={{ px: 3, fontWeight: 600, color: 'text.secondary' }}
              >
                Cancel
              </Button>
            )}
            {onSave && (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={onSave}
                disabled={isSubmitting}
                sx={{ px: 4, fontWeight: 600 }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {/* Form Content */}
          <div className="p-3 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
