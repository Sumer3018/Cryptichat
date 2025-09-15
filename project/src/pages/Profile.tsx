// src/pages/Profile.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Import the MessageSquare icon for the new button
import { Settings, LogOut, RefreshCw, MessageSquare } from 'lucide-react'; 
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Profile {
  full_name: string | null;
  username: string | null;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        if (!user?.id) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  }

  async function handleRefreshProfile() {
    setLoading(true);
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError('Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-gray-500 mr-4" />
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            </div>
            <div className="flex space-x-4">
              {/* 2. ADDED THE NEW "BACK TO CHATS" BUTTON HERE */}
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Back to Chats
              </button>
              
              <button
                onClick={handleRefreshProfile}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Profile
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              <div className="mt-2 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {profile?.full_name || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {profile?.username || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {user?.email || 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}