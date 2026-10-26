import React from 'react';

export interface FormCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const FormCard: React.FC<FormCardProps> = ({
  title,
  icon,
  children,
  className = '',
  action,
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 ${className}`}>
      <div className="bg-gray-50/70 px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="p-1.5 bg-white rounded-lg border border-gray-200/80 shadow-2xs flex items-center justify-center">
              {icon}
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-800 tracking-tight">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

export default FormCard;
