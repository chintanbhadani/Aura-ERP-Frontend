import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import dataService from '../axios/dataService';

export const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const checkMaintenance = useCallback(async () => {
    // If already on maintenance page, no need to check
    if (typeof window === 'undefined' || window.location.pathname.includes('maintenance.html')) {
      return;
    }

    try {
      const res = await dataService.get('/system/maintenance');
      if (res.data?.maintenance) {
        window.location.href = '/maintenance.html';
      }
    } catch (err: any) {
      if (err.response?.status === 503 || err.response?.data?.maintenance) {
        window.location.href = '/maintenance.html';
      }
    }
  }, []);

  useEffect(() => {
    // 1. Check immediately on mount
    checkMaintenance();

    // 2. Poll every 4 seconds so open dashboards immediately redirect when /down is sent
    const interval = setInterval(checkMaintenance, 4000);

    // 3. Check immediately when user switches back to this browser tab
    const handleVisibility = () => {
      if (!document.hidden) {
        checkMaintenance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkMaintenance);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkMaintenance);
    };
  }, [checkMaintenance]);

  // 4. Also check on every page / route transition
  useEffect(() => {
    checkMaintenance();
  }, [location.pathname, checkMaintenance]);

  return <>{children}</>;
};

export default MaintenanceGuard;

