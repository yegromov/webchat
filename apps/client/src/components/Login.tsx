import { useState, FormEvent } from 'react';
import { api } from '../services/api';
import { useChatStore } from '../store/chat';
import { countries } from '@webchat/shared';

export function Login() {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'F' | 'M' | ''>('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useChatStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setError('Age must be between 13 and 120');
        setLoading(false);
        return;
      }

      if (!sex) {
        setError('Please select your sex');
        setLoading(false);
        return;
      }

      if (!country) {
        setError('Please select your country');
        setLoading(false);
        return;
      }

      const { token, user } = await api.login(username, ageNum, sex, country);
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          WebChat
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Fast anonymous web chat
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={3}
              maxLength={20}
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="age"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Age
            </label>
            <input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min={13}
              max={120}
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="sex"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Sex
            </label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'F' | 'M')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select your sex</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select your country</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Chat'}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-gray-500">
          No registration required. Just pick a username and start chatting!
        </p>
      </div>
    </div>
  );
}
