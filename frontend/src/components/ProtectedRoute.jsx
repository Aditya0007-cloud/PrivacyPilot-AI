import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getDashboardPath } from "../lib/auth.js";
import { useAuth } from "../context/auth-context.js";

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faf8] text-ink">
        <div className="rounded-lg border border-ink/10 bg-white px-5 py-4 text-sm font-medium shadow-sm">
          Checking your session...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}
