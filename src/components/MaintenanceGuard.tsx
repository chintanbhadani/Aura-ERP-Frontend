import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import dataService from '../axios/dataService';

export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const checkMaintenance = useCallback(async () => {
    if (typeof window === 'undefined' || window.location.pathname.includes('maintenance.html')) {
      return;
    }

    try {
      const res = await dataService.get('/system/maintenance');
      if (res.data?.maintenance === true) {
        window.location.href = '/maintenance.html';
      }
    } catch (err: any) {
      if (err.response?.status === 503 && err.response?.data?.maintenance === true) {
        window.location.href = '/maintenance.html';
      }
    }
  }, []);

  // Check on route change or initial load only (no background polling interval)
  useEffect(() => {
    checkMaintenance();
  }, [location.pathname, checkMaintenance]);

  return <>{children}</>;
};

export default MaintenanceGuard;
