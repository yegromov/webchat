const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async login(username: string, age: number, sex: string, country: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, age, sex, country }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  async verifyToken(token: string) {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return response.json();
  },

  async getRooms(token: string) {
    const response = await fetch(`${API_URL}/api/rooms`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rooms');
    }

    return response.json();
  },

  async createRoom(token: string, name: string) {
    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }

    return response.json();
  },

  async getRoomMessages(token: string, roomId: string, limit = 50) {
    const response = await fetch(
      `${API_URL}/api/rooms/${roomId}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  },
};
