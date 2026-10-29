import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Loader from './Loader/Loader';
import type { ReduxState } from '../helper/fe.interface';

export const ProtectedRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const loginToken = useSelector((state: ReduxState) => state.base?.token);

  useEffect(() => {
    if (!loginToken) {
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }

    setIsCheckingAuth(false);
  }, [loginToken, navigate, location]);

  if (isCheckingAuth || !loginToken) {
    return <Loader />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
