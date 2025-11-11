import { useEffect, useState } from 'react';
import { useChatStore } from './store/chat';
import { api } from './services/api';
import { Login } from './components/Login';
import { Chat } from './components/Chat';

function App() {
  const { user, setUser, setToken } = useChatStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api
        .verifyToken(token)
        .then(({ user }) => {
          setToken(token);
          setUser(user);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <Chat /> : <Login />;
}

export default App;
