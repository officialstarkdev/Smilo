import { createContext, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api.js';

// Staff authentication only. Patients never sign in.
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return setLoading(false);
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
