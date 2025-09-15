// src/pages/Confirmed.tsx

import { Link } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';

export default function Confirmed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="h-10 w-10 text-green-600" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Congratulations!
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Your account has been verified successfully.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            You can now sign in to start chatting securely.
          </p>
        </div>
        <div className="mt-6">
          <Link
            to="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}