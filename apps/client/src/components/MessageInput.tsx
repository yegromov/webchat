import { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { wsService } from '../services/websocket';
import { useChatStore } from '../store/chat';
import { api } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentRoom } = useChatStore();

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || !currentRoom) return;

    setUploading(true);
    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        const result = await api.uploadImage(token, selectedImage);
        imageUrl = result.url;
      }

      // Send message via WebSocket
      wsService.sendMessage(message.trim(), currentRoom.id, imageUrl);

      // Reset form
      setMessage('');
      handleRemoveImage();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  if (!currentRoom) {
    return (
      <div className="p-4 bg-gray-100 text-center text-gray-500">
        Select a room to start chatting
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 border-t">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-32 rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Attach image"
        >
          📎
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={1000}
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={(!message.trim() && !selectedImage) || uploading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
