import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Loader from './Loader/Loader';
import type { ReduxState } from '../helper/fe.interface';
import { hasModulePermission } from '../helper/helper';
import { Permission } from '../helper/constants';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import { fetchUserProfile } from '../services/auth.service';
import { setRoleDetails } from '../slices/Base';

export const WithAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleName?: string,
  permission?: string
) => {
  const WithAuthComponent: React.FC<P> = (props: P) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);

    const reduxToken = useSelector((state: ReduxState) => state.base?.token);
    const reduxRoleDetails = useSelector((state: ReduxState) => state.base?.roleDetails);

    useEffect(() => {
      let isMounted = true;

      const checkAccess = async () => {
        const token = reduxToken || localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Determine current role details
        let currentRoleDetails = reduxRoleDetails;
        if (!currentRoleDetails) {
          try {
            const cached = localStorage.getItem('roleDetails');
            if (cached) {
              currentRoleDetails = JSON.parse(cached);
              dispatch(setRoleDetails(currentRoleDetails));
            }
          } catch (e) {
            // ignore JSON parse error
          }
        }

        // Fetch fresh profile if roleDetails is still missing
        if (!currentRoleDetails) {
          try {
            const profile = await fetchUserProfile();
            if (profile && (profile as any).roleDetails) {
              currentRoleDetails = (profile as any).roleDetails;
              dispatch(setRoleDetails(currentRoleDetails));
              localStorage.setItem('roleDetails', JSON.stringify(currentRoleDetails));
            }
          } catch (err) {
            console.error('Failed to fetch user profile in WithAuth:', err);
          }
        }

        if (!isMounted) return;

        // If a specific module permission is required, enforce it
        if (moduleName) {
          if (!currentRoleDetails || !Array.isArray(currentRoleDetails.permissionsDetails)) {
            setIsUnauthorized(true);
            setIsCheckingAuth(false);
            return;
          }

          const permsList = currentRoleDetails.permissionsDetails;
          const hasAccess = hasModulePermission(
            permsList,
            moduleName,
            permission || Permission.LIST
          );

          if (!hasAccess) {
            setIsUnauthorized(true);
            setIsCheckingAuth(false);
            return;
          }
        }

        setIsUnauthorized(false);
        setIsCheckingAuth(false);
      };

      checkAccess();

      return () => {
        isMounted = false;
      };
    }, [reduxToken, reduxRoleDetails, navigate, moduleName, permission, dispatch]);

    if (isCheckingAuth) {
      return <Loader />;
    }

    // if (isUnauthorized) {
    //   const activeRole = reduxRoleDetails?.name || (() => {
    //     try {
    //       const cached = localStorage.getItem('roleDetails');
    //       return cached ? JSON.parse(cached)?.name : 'User';
    //     } catch {
    //       return 'User';
    //     }
    //   })();

    //   return (
    //     <UnauthorizedPage
    //       moduleName={moduleName}
    //       permission={permission || Permission.LIST}
    //       userRole={activeRole}
    //     />
    //   );
    // }

    return <WrappedComponent {...props} />;
  };

  return WithAuthComponent;
};

export default WithAuth;

