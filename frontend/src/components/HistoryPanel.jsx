// src/components/HistoryPanel.jsx (Enhanced with React Icons and fixed layout)
import { useState, useEffect } from 'react';
import { MdClose, MdMessage, MdCalendarToday, MdMenuBook, MdAccessTime, MdCode, MdCalculate, MdEdit, MdScience } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';
import { formatRelativeTime, formatTime } from '../utils/timeUtils';

const HistoryPanel = ({ setCurrentSessionId, setShowHistoryPanel, currentSessionId, setCurrentView, loadSessionMessages }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/api/sessions/list');
        const data = Array.isArray(res.data) ? res.data : [];
        setSessions(data);
      } catch (err) {
        setError('Failed to load history');
        toast.error('History Fetch Error: ' + (err.response?.data?.detail || err.message));
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const loadSession = async (id) => {
    try {
      setLoadingSession(id);
      setCurrentSessionId(id);
      setCurrentView('chat');
      
      // Load messages for this session
      if (loadSessionMessages) {
        const loaded = await loadSessionMessages(id);
        if (loaded) {
          setShowHistoryPanel(false);
          toast.success('Session loaded!');
        } else {
          toast.error('No messages found in this session');
        }
      } else {
        setShowHistoryPanel(false);
        toast.success('Session loaded!');
      }
    } catch (error) {
      toast.error('Failed to load session: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingSession(null);
    }
  };

  const formatDate = (dateString) => {
    return formatRelativeTime(dateString);
  };

  const getSubjectIcon = (subject) => {
    switch (subject) {
      case 'coding': return <MdCode className="text-green-400" />;
      case 'math': return <MdCalculate className="text-blue-400" />;
      case 'ielts': return <MdEdit className="text-purple-400" />;
      case 'physics': return <MdScience className="text-orange-400" />;
      default: return <MdMenuBook className="text-gray-400" />;
    }
  };

  const getSubjectColor = (subject) => {
    switch (subject) {
      case 'coding': return 'from-green-500 to-green-600';
      case 'math': return 'from-blue-500 to-blue-600';
      case 'ielts': return 'from-purple-500 to-purple-600';
      case 'physics': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 lg:absolute lg:left-80 lg:top-0 lg:h-screen lg:w-80 bg-gray-900/50 lg:bg-gray-800 p-4 lg:p-6 overflow-y-auto custom-scroll shadow-xl z-50">
      <div className="bg-gray-800 lg:bg-transparent rounded-xl lg:rounded-none p-4 lg:p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <MdMessage className="w-6 h-6 text-blue-400 mr-3" />
            <h3 className="text-white text-xl font-bold">Chat History</h3>
          </div>
          <button 
            onClick={() => setShowHistoryPanel(false)} 
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium">Total Sessions</p>
              <p className="text-white text-2xl font-bold">{sessions.length}</p>
            </div>
            <MdMenuBook className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Loading sessions...</span>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {!loading && !error && sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg mb-2">No sessions yet</p>
              <p className="text-gray-500 text-sm">Start chatting to create your first session!</p>
            </div>
          ) : (
            sessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => !loadingSession && loadSession(session.id)} 
                className={`cursor-pointer p-3 lg:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                  loadingSession === session.id
                    ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-wait'
                    : session.id === currentSessionId 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 text-white shadow-lg' 
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="mr-3 flex-shrink-0">
                      {getSubjectIcon(session.subject)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm lg:text-base truncate" title={session.name || 'Untitled'}>
                        {session.name || 'Untitled Session'}
                      </h4>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <MdCalendarToday size={12} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{formatDate(session.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getSubjectColor(session.subject)} text-white flex-shrink-0 ml-2`}>
                    {session.subject}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-gray-400">
                    <MdAccessTime size={12} className="mr-1" />
                    {formatTime(session.created_at)}
                  </div>
                  {loadingSession === session.id ? (
                    <div className="flex items-center text-gray-400">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 mr-1"></div>
                      Loading...
                    </div>
                  ) : session.id === currentSessionId ? (
                    <div className="flex items-center text-blue-200">
                      <div className="w-2 h-2 bg-blue-200 rounded-full mr-1"></div>
                      Active
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;