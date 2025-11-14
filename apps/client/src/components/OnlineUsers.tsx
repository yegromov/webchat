import { useChatStore } from '../store/chat';
import { api } from '../services/api';
import { useState } from 'react';

export function OnlineUsers() {
  const { onlineUsers, user, token, setCurrentDMUser, blockedUsers, addBlockedUser, removeBlockedUser } = useChatStore();
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  const filteredUsers = onlineUsers.filter(u => u.id !== user?.id);

  const handleUserClick = (clickedUser: typeof onlineUsers[0]) => {
    setCurrentDMUser(clickedUser);
  };

  const handleBlockToggle = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    setBlockingUserId(userId);
    try {
      if (blockedUsers.includes(userId)) {
        await api.unblockUser(token, userId);
        removeBlockedUser(userId);
      } else {
        await api.blockUser(token, userId);
        addBlockedUser(userId);
      }
    } catch (error) {
      console.error('Failed to toggle block:', error);
    } finally {
      setBlockingUserId(null);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Online Users ({filteredUsers.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No other users online
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((onlineUser) => {
              const isBlocked = blockedUsers.includes(onlineUser.id);
              const color = onlineUser.sex === 'F' ? 'text-pink-600' : 'text-blue-600';

              return (
                <div
                  key={onlineUser.id}
                  className={`p-3 hover:bg-gray-100 cursor-pointer transition-colors ${
                    isBlocked ? 'opacity-50' : ''
                  }`}
                  onClick={() => !isBlocked && handleUserClick(onlineUser)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${color} truncate`}>
                          {onlineUser.username}
                        </span>
                        <span className="text-gray-500 text-sm">({onlineUser.age})</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleBlockToggle(onlineUser.id, e)}
                      disabled={blockingUserId === onlineUser.id}
                      className={`text-xs px-2 py-1 rounded ${
                        isBlocked
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } transition-colors disabled:opacity-50`}
                      title={isBlocked ? 'Unblock user' : 'Block user'}
                    >
                      {blockingUserId === onlineUser.id
                        ? '...'
                        : isBlocked
                        ? 'Unblock'
                        : 'Block'}
                    </button>
                  </div>
                  {isBlocked && (
                    <div className="text-xs text-gray-500 mt-1">Blocked</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
