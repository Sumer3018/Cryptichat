// src/App.tsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Confirmed from './pages/Confirmed';

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/chat" />} />
      <Route path="/register" element={!session ? <Register /> : <Navigate to="/chat" />} />
      <Route path="/confirmed" element={<Confirmed />} />
      
      {/* The /auth/callback route is no longer needed */}

      <Route path="/chat" element={session ? <Chat /> : <Navigate to="/login" />} />
      <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={session ? "/chat" : "/login"} />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;