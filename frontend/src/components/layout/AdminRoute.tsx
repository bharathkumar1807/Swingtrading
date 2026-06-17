import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export function AdminRoute() {
  const user = useAppSelector((state) => state.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles?.includes("Admin")) return <Navigate to="/" replace />;
  return <Outlet />;
}
