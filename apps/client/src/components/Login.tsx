import { useState, FormEvent } from 'react';
import { api } from '../services/api';
import { useChatStore } from '../store/chat';
import { countries } from '@webchat/shared';

type Step = 'profile' | 'password' | 'registration';

export function Login() {
  const [step, setStep] = useState<Step>('profile');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'F' | 'M' | ''>('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useChatStore();

  const handleProfileSubmit = async (e: FormEvent) => {
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

      // Check username availability
      const result = await api.checkUsername(username);

      if (result.available) {
        // Username available - offer registration
        setStep('registration');
      } else if (result.registered) {
        // Username taken by registered user - require password
        setIsRegistered(true);
        setStep('password');
      } else {
        // Username taken by anonymous user
        setError('Username is already taken. Please choose another name.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check username');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ageNum = parseInt(age, 10);

      // If on password step and no password entered, show error
      if (step === 'password' && isRegistered && !password) {
        setError('Password is required for this username');
        setLoading(false);
        return;
      }

      // Login with optional password
      const { token, user } = await api.login(
        username,
        ageNum,
        sex,
        country,
        password || undefined
      );

      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('profile');
    setPassword('');
    setError('');
    setIsRegistered(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          WebChat
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {step === 'profile' && 'Fast anonymous web chat'}
          {step === 'password' && 'Welcome back! Enter your password'}
          {step === 'registration' && 'Secure your username (optional)'}
        </p>

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
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
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
        )}

        {(step === 'password' || step === 'registration') && (
          <form onSubmit={handleFinalSubmit}>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Username:</span> {username}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Age:</span> {age}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Sex:</span> {sex === 'F' ? 'Female' : 'Male'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Country:</span> {country}
              </p>
            </div>

            {step === 'password' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-gray-700">
                  This username is already registered. Please enter your password to continue.
                </p>
              </div>
            )}

            {step === 'registration' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Great! This username is available.</strong>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  You can join anonymously or set a password to secure your username for future use. <strong>Registration is optional.</strong>
                </p>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password {step === 'registration' && '(optional)'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={step === 'registration' ? 'Leave empty to join anonymously' : 'Enter your password'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={step === 'password'}
                minLength={6}
                disabled={loading}
              />
              {step === 'registration' && (
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters if you want to register
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Joining...' : step === 'registration' ? 'Join Chat' : 'Login'}
              </button>
            </div>
          </form>
        )}

        {error && step === 'profile' && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <p className="mt-6 text-xs text-center text-gray-500">
          {step === 'profile' && 'No registration required. Just pick a username and start chatting!'}
          {step === 'password' && 'Forgot your password? Choose another username.'}
          {step === 'registration' && 'Registering keeps your username for future sessions.'}
        </p>
      </div>
    </div>
  );
}
