/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from './types';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ResetPassword from './components/ResetPassword';
import DBStatusBanner from './components/DBStatusBanner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('helpdesk_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('helpdesk_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('helpdesk_user');
  };

  const handlePasswordReset = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('helpdesk_user', JSON.stringify(updatedUser));
  };

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <DBStatusBanner />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  if (user.is_first_login) {
    return (
      <>
        <Toaster position="top-right" />
        <DBStatusBanner />
        <ResetPassword user={user} onSuccess={handlePasswordReset} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <DBStatusBanner />
      <Dashboard user={user} onLogout={handleLogout} />
    </>
  );
}


