import { useState } from 'react';

export const useAuth = () => {
  const [loggedInUserId, setLoggedInUserId] = useState(localStorage.getItem('selva_user_id') || null);

  const login = (userId) => {
    localStorage.setItem('selva_user_id', userId);
    setLoggedInUserId(userId);
  };

  const logout = () => {
    localStorage.removeItem('selva_user_id');
    setLoggedInUserId(null);
  };

  return {
    loggedInUserId,
    login,
    logout
  };
};
