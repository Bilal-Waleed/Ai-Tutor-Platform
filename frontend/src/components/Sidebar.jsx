import { MdAdd, MdMessage, MdHistory, MdMenuBook, MdCode, MdBarChart, MdLogout, MdClose, MdQuiz } from 'react-icons/md';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import RecommendationsWidget from './RecommendationsWidget';

const Sidebar = ({ setCurrentView, setShowSubjectModal, setIsLoggedIn, setShowProgressModal, setShowHistoryPanel, startNewChat, currentView, setSidebarOpen, currentSubject, userPreferredSubject, setSubjectModalContext }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    Cookies.remove('token');
    setIsLoggedIn(false);
    toast.info('Logged out successfully!');
    navigate('/login');
  };

  const menuItems = [
    { id: 'chat', icon: MdMessage, label: 'Chat', action: () => { setCurrentView('chat'); setSidebarOpen?.(false); } },
    { id: 'history', icon: MdHistory, label: 'Chat History', action: () => { setShowHistoryPanel(true); setSidebarOpen?.(false); } },
    { id: 'subject', icon: MdMenuBook, label: 'Subject', action: () => { setSubjectModalContext('chat'); setShowSubjectModal(true); setSidebarOpen?.(false); } },
    { id: 'quiz-analytics', icon: MdBarChart, label: 'Quiz Analytics', action: () => { setCurrentView('quiz-analytics'); setSidebarOpen?.(false); } },
    { id: 'quiz-history', icon: MdHistory, label: 'Quiz History', action: () => { setCurrentView('quiz-history'); setSidebarOpen?.(false); } },
    { id: 'code', icon: MdCode, label: 'Code Debug', action: () => { setCurrentView('code'); setSidebarOpen?.(false); } },
    { id: 'progress', icon: MdBarChart, label: 'Progress Dashboard', action: () => { setShowProgressModal(true); setSidebarOpen?.(false); } },
  ];

  return (
    <div className="w-80 lg:w-80 sm:w-72 w-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col py-4 lg:py-6 space-y-3 lg:space-y-4 h-screen justify-between shadow-xl overflow-y-auto custom-scroll">
      {/* Mobile Close Button */}
      <div className="lg:hidden flex justify-end px-4">
        <button
          onClick={() => setSidebarOpen?.(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <MdClose size={24} />
        </button>
      </div>

      {/* Logo/Brand */}
      <div className="text-center px-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-2 mx-auto">
          <span className="text-white font-bold text-lg">AI</span>
        </div>
        <p className="text-xs text-gray-400 font-medium">Tutor</p>
      </div>

      {/* Recommendations Widget */}
      <div className="px-4">
        <RecommendationsWidget 
          setCurrentView={setCurrentView}
          setShowSubjectModal={setShowSubjectModal}
          startNewChat={startNewChat}
          recommendationSubject={userPreferredSubject}
          setSubjectModalContext={setSubjectModalContext}
        />
      </div>

      {/* Navigation Menu */}
      <div className="flex flex-col space-y-2 lg:space-y-3 px-4 flex-1">
        <button 
          onClick={startNewChat} 
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-green-500/25 p-2 lg:p-3"
        >
          <MdAdd size={18} className="lg:w-5 lg:h-5 text-white mr-2" />
          <span className="text-white font-medium text-sm lg:text-base">New Chat</span>
        </button>

        <button 
          onClick={() => { setCurrentView('quiz'); setSidebarOpen?.(false); }} 
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-blue-500/25 p-2 lg:p-3"
        >
          <MdQuiz size={18} className="lg:w-5 lg:h-5 text-white mr-2" />
          <span className="text-white font-medium text-sm lg:text-base">Start Learning with Quiz</span>
        </button>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button 
              key={item.id}
              onClick={item.action} 
              className={`w-full rounded-xl flex items-center justify-start transition-all duration-200 p-2 lg:p-3 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25' 
                  : 'hover:bg-gray-700 hover:shadow-lg'
              }`}
            >
              <Icon size={18} className={`lg:w-5 lg:h-5 ${isActive ? 'text-white mr-2 lg:mr-3' : 'text-gray-400 mr-2 lg:mr-3'}`} />
              <span className={`${isActive ? 'text-white font-medium' : 'text-gray-400 font-medium'} text-sm lg:text-base`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-4">
        <button 
          onClick={handleLogout} 
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-red-500/25 p-2 lg:p-3" 
        >
          <MdLogout size={18} className="lg:w-5 lg:h-5 text-white mr-2" />
          <span className="text-white font-medium text-sm lg:text-base">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;