import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isProtectedRoute = (pathname) => {
  const protectedRoutes = [
    "/dashboard",
    "/devices",
    "/users",
    "/my-dashboard",
    "/map",
    "/myprofile",
    "/editprofile",
    "/changepassword",
    "/tank-types",
    "/tank-live-data",
    "/alerts",
    "/system-monitoring",
    "/admin",
    "/tanks",
    "/tank-details",
  ]

  return protectedRoutes.some((route) => pathname.startsWith(route))
}
