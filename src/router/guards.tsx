import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

/** 登录守卫：无 token 跳转登录页 */
export function RequireAuth() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** 访客守卫：已登录访问登录页时跳转概览 */
export function GuestOnly() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
