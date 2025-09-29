// src/hooks/useLogout.js
import { useCallback } from 'react';
import toast from 'react-hot-toast'; // For showing success/error messages
import { useAuth } from '../contexts/AuthContext'; // <--- IMPORT THE AUTH CONTEXT!

function useLogout() {
  const { logout: authContextLogout } = useAuth(); // Get the logout function from AuthContext

  // IMPORTANT: Removed the callServerLogout function and its internal toast.error.
  // The AuthContext's logout function already handles client-side cleanup (cookie, state, navigation).
  // If server-side token invalidation is needed, it should be a separate, silent operation
  // that does not interfere with the user's immediate logout feedback (the success toast).

  const handleLogout = useCallback(async () => {
    // 1. Trigger the centralized logout logic from AuthContext.
    // This will handle:
    //    - Setting isManuallyLoggingOut.current to true (to suppress toasts from fetchUserProfile)
    //    - Removing the 'token' cookie
    //    - Updating isAuthenticated state to false and user to null
    //    - Navigating to the /login page
    authContextLogout();

    // 2. Any additional client-side cleanup not handled by AuthContext
    // Example: localStorage.removeItem('authToken'); // If you also store token in localStorage

    // 3. Display the single, desired success toast message
    toast.success('You have been logged out.');
  }, [authContextLogout]);

  return handleLogout;
}

export default useLogout;
