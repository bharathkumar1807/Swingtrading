import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
