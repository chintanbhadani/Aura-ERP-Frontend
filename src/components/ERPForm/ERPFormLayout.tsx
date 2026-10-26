import React from 'react';
import { ERPFormPageLayout } from './ERPFormPageLayout';
import { ERPFormHeader } from './ERPFormHeader';
import { ButtonComponent } from '../button/ButtonComponent';

export interface ERPFormLayoutProps {
  title: string;
  status?: string;
  onSave?: (e?: any) => void;
  onSubmit?: (e?: any) => void;
  onCancel: () => void;
  saving?: boolean;
  submitting?: boolean;
  customActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ERPFormLayout: React.FC<ERPFormLayoutProps> = ({
  title,
  status = 'Draft',
  onSave,
  onSubmit,
  onCancel,
  saving = false,
  submitting = false,
  customActions,
  children,
  className = '',
}) => {
  return (
    <ERPFormPageLayout
      className={className}
      header={
        <ERPFormHeader
          title={title}
          onBack={onCancel}
          backTitle="Back"
          statusBadge={{
            label: status,
            variant:
              status === 'Completed'
                ? 'success'
                : status === 'Submitted' || status === 'Approved'
                ? 'blue'
                : status === 'Cancelled'
                ? 'error'
                : status === 'In Production'
                ? 'warning'
                : 'gray',
          }}
          customActions={
            <>
              {customActions}
              {onSubmit && (
                <ButtonComponent
                  type="button"
                  variant="primary"
                  onClick={onSubmit}
                  disabled={saving || submitting}
                  loading={submitting}
                  loadingText="Submitting..."
                >
                  Submit
                </ButtonComponent>
              )}
            </>
          }
          onSave={onSave}
          isSubmitting={saving}
        />
      }
    >
      {children}
    </ERPFormPageLayout>
  );
};

export default ERPFormLayout;
