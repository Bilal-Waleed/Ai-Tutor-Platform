import { Plus, MessageCircle, History, Book, Code, BarChart, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Sidebar = ({ setCurrentView, setShowSubjectModal, setIsLoggedIn, setShowProgressModal, setShowHistoryPanel, startNewChat }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    Cookies.remove('token');
    setIsLoggedIn(false);
    toast.info('Logged out successfully!');
    navigate('/login');
  };

  return (
    <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-6 h-screen justify-between">
      <div className="flex flex-col space-y-6">
        <button 
          onClick={startNewChat} 
          className="hover:bg-gray-700 p-2 rounded transition"
          title="New Chat"
        >
          <Plus size={24} />
        </button>
        <button onClick={() => setCurrentView('chat')} className="hover:bg-gray-700 p-2 rounded" title="Chat">
          <MessageCircle size={24} />
        </button>
        <button onClick={() => setShowHistoryPanel(true)} className="hover:bg-gray-700 p-2 rounded" title="History">
          <History size={24} />
        </button>
        <button onClick={() => setShowSubjectModal(true)} className="hover:bg-gray-700 p-2 rounded" title="Subject">
          <Book size={24} />
        </button>
        <button onClick={() => setCurrentView('code')} className="hover:bg-gray-700 p-2 rounded" title="Code Debug">
          <Code size={24} />
        </button>
        <button onClick={() => setShowProgressModal(true)} className="hover:bg-gray-700 p-2 rounded" title="Progress">
          <BarChart size={24} />
        </button>
      </div>
      <button onClick={handleLogout} className="hover:bg-red-600 p-2 rounded mb-4" title="Logout">
        <LogOut size={24} />
      </button>
    </div>
  );
};

export default Sidebar;