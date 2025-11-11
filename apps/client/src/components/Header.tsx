import { useChatStore } from '../store/chat';

export function Header() {
  const { user, currentRoom, onlineUsers, logout } = useChatStore();

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800">
          {currentRoom ? currentRoom.name : 'WebChat'}
        </h1>
        {currentRoom && (
          <p className="text-sm text-gray-500">
            {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-medium text-gray-800">{user?.username}</div>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
