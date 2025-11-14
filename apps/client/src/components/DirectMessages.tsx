import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useChatStore } from '../store/chat';
import { wsService } from '../services/websocket';
import { api } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DirectMessages() {
  const { user, currentDMUser, directMessages, setCurrentDMUser } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [directMessages]);

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

  if (!currentDMUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No conversation selected</p>
          <p className="text-sm mt-2">Click on an online user to start chatting</p>
        </div>
      </div>
    );
  }

  const conversationMessages = directMessages.filter(
    (msg) =>
      (msg.senderId === user?.id && msg.receiverId === currentDMUser.id) ||
      (msg.senderId === currentDMUser.id && msg.receiverId === user?.id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || !currentDMUser) return;

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

      // Send DM via WebSocket
      wsService.sendDM(currentDMUser.id, input.trim(), imageUrl);

      // Reset form
      setInput('');
      handleRemoveImage();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const userColor = currentDMUser.sex === 'F' ? 'text-pink-600' : 'text-blue-600';

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h2 className={`font-semibold ${userColor}`}>
            {currentDMUser.username} ({currentDMUser.age})
          </h2>
          <p className="text-sm text-gray-500">Direct Message</p>
        </div>
        <button
          onClick={() => setCurrentDMUser(null)}
          className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((msg) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {msg.imageUrl && (
                    <div className="mb-2">
                      <img
                        src={`${API_URL}${msg.imageUrl}`}
                        alt="Attachment"
                        className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(`${API_URL}${msg.imageUrl}`, '_blank')}
                        loading="lazy"
                      />
                    </div>
                  )}
                  {msg.content && (
                    <p className="break-words">{msg.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${currentDMUser.username}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={1000}
            disabled={uploading}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || uploading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
