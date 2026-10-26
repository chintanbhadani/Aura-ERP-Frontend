import React from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export interface ERPFormPageLayoutProps {
  header: React.ReactNode;
  workflowBanner?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  recordCode?: string;
  breadcrumb?: React.ReactNode;
}

export const ERPFormPageLayout: React.FC<ERPFormPageLayoutProps> = ({
  header,
  workflowBanner,
  sidebar,
  children,
  className = '',
  recordCode,
  breadcrumb,
}) => {
  return (
    <DashboardLayout recordCode={recordCode} breadcrumb={breadcrumb}>
      <div className="flex flex-col min-h-full bg-gray-50/50 font-sans pb-12">
        {header}

        <div className={`max-w-7xl mx-auto w-full px-2.5 sm:px-4 md:px-6 pt-3 sm:pt-5 space-y-4 sm:space-y-5 ${className}`}>
          {workflowBanner}

          {sidebar ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="w-full lg:w-72 shrink-0 space-y-5">
                {sidebar}
              </div>
              <div className="flex-1 w-full min-w-0">
                {children}
              </div>
            </div>
          ) : (
            <div className="w-full">
              {children}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ERPFormPageLayout;
