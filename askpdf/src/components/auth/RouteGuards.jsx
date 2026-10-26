import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/** Only for signed-in users — otherwise go to sign-in and come back afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Sign-in / sign-up pages — signed-in users go straight to the app. */
export function PublicOnly() {
  const { status } = useAuth();
  return status === 'authenticated' ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
