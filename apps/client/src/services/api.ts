const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async checkUsername(username: string) {
    const response = await fetch(`${API_URL}/api/auth/check-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check username');
    }

    return response.json();
  },

  async login(username: string, age: number, sex: string, country: string, password?: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, age, sex, country, password }),
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

  async getDMs(token: string) {
    const response = await fetch(`${API_URL}/api/dms`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DMs');
    }

    return response.json();
  },

  async getDMConversation(token: string, userId: string) {
    const response = await fetch(`${API_URL}/api/dms/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DM conversation');
    }

    return response.json();
  },

  async blockUser(token: string, userId: string) {
    const response = await fetch(`${API_URL}/api/users/${userId}/block`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }

    return response.json();
  },

  async unblockUser(token: string, userId: string) {
    const response = await fetch(`${API_URL}/api/users/${userId}/block`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }

    return response.json();
  },

  async getBlockedUsers(token: string) {
    const response = await fetch(`${API_URL}/api/blocked-users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }

    return response.json();
  },

  async uploadImage(token: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  },
};
