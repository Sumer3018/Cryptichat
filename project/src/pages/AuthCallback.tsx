// src/pages/AuthCallback.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * This component has one, very important job:
 * When a user lands here from a confirmation link, the URL will have session tokens
 * in the hash (e.g., /auth/callback#access_token=...).
 * We must remove this hash from the URL and redirect to the '/confirmed' page
 * BEFORE the main Supabase client in AuthContext has time to detect it and log the user in.
 * This component prevents the auto-login race condition.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // This effect runs immediately when the component mounts.
    // By using window.history.replaceState, we can change the URL in the
    // browser's address bar without causing a page reload.
    // This is a direct browser API call that is faster than React's state-based navigation.

    // Check if the hash contains the access_token from Supabase
    if (window.location.hash.includes('access_token')) {
      // If it does, immediately replace the current history entry.
      // We change the path to '/confirmed' and clear the hash.
      navigate('/confirmed', { replace: true });
    } else {
      // If the user somehow lands here without a token, send them to login.
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // This UI will be visible for a fraction of a second while the redirect happens.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      <h2 className="mt-4 text-2xl font-bold text-gray-700">Finalizing confirmation...</h2>
    </div>
  );
}