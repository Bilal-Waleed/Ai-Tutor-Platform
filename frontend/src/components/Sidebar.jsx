import { Plus, MessageCircle, History, Book, Code, BarChart, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Sidebar = ({ setCurrentView, setShowSubjectModal, setIsLoggedIn, setShowProgressModal, setShowHistoryPanel, startNewChat, currentView }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    Cookies.remove('token');
    setIsLoggedIn(false);
    toast.info('Logged out successfully!');
    navigate('/login');
  };

  const menuItems = [
    { id: 'chat', icon: MessageCircle, label: 'Chat', action: () => setCurrentView('chat') },
    { id: 'code', icon: Code, label: 'Code Debug', action: () => setCurrentView('code') },
    { id: 'history', icon: History, label: 'History', action: () => setShowHistoryPanel(true) },
    { id: 'subject', icon: Book, label: 'Subject', action: () => setShowSubjectModal(true) },
    { id: 'progress', icon: BarChart, label: 'Progress', action: () => setShowProgressModal(true) },
  ];

  return (
    <div className="w-20 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center py-6 space-y-4 h-screen justify-between shadow-xl">
      {/* Logo/Brand */}
      <div className="text-center">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-2">
          <span className="text-white font-bold text-lg">AI</span>
        </div>
        <p className="text-xs text-gray-400 font-medium">Tutor</p>
      </div>

      {/* Navigation Menu */}
      <div className="flex flex-col space-y-3">
        <button 
          onClick={startNewChat} 
          className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-green-500/25"
          title="New Chat"
        >
          <Plus size={20} className="text-white" />
        </button>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button 
              key={item.id}
              onClick={item.action} 
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25' 
                  : 'hover:bg-gray-700 hover:shadow-lg'
              }`}
              title={item.label}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
            </button>
          );
        })}
      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout} 
        className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-red-500/25" 
        title="Logout"
      >
        <LogOut size={20} className="text-white" />
      </button>
    </div>
  );
};

export default Sidebar;