import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const WithAuth = <P extends {}>(WrappedComponent: React.ComponentType<P>, moduleName?: string, permission?: string) => {
  const WithAuthComponent: React.FC<P> = (props: P) => {
    const navigate = useNavigate();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const loginToken = useSelector((state: RootState) => state.base.token);

    useEffect(() => {
      if (!loginToken) {
        navigate('/login', { replace: true });
        return;
      }

      setIsCheckingAuth(false);
    }, [loginToken, navigate]);

    if (isCheckingAuth) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#ebf7f0]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0f8b5a]"></div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuthComponent;
};

export default WithAuth;
