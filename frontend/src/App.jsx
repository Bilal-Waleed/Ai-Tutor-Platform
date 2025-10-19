import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import api from './services/api';
import ToastProvider from './components/ToastProvider';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatHistory from './components/ChatHistory';
import MessageBar from './components/MessageBar';
import ProgressModal from './components/ProgressModal';
import SubjectSelector from './components/SubjectSelector';
import CodeDebug from './components/CodeDebug';
import HistoryPanel from './components/HistoryPanel';
import { toast } from 'react-toastify';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [currentView, setCurrentView] = useState('chat');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionName, setSessionName] = useState('New Chat');
  const [responseLoading, setResponseLoading] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('general');
  const [page, setPage] = useState(1);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 > Date.now()) {
            setIsLoggedIn(true);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const userRes = await api.get('/api/auth/me');
            const userSubject = userRes.data.current_subject || 'general';
            setCurrentSubject(userSubject);
            
            const userId = decoded.sub;
            const stored = JSON.parse(localStorage.getItem(`appState_${userId}`) || '{}');
            if (stored.sessionId) {
              setCurrentSessionId(stored.sessionId);
              setCurrentSubject(stored.subject || userSubject);
              const loaded = await loadMessages(stored.sessionId, 1);
              if (!loaded) startNewChat();
            } else if (userSubject === 'general') {
              setShowSubjectModal(true);
            }
          } else {
            clearLocalStorage();
            toast.warning('Session expired. Please login again.');
          }
        } catch (err) {
          clearLocalStorage();
          toast.error('Invalid token. Logging out.');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId, page);
    }
  }, [currentSessionId, page]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current && chatContainerRef.current.scrollTop === 0 && messages.length >= 10) {
        setPage(prev => prev + 1);
      }
    };
    const container = chatContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [messages]);

  const loadMessages = async (sessionId, newPage = 1) => {
    try {
      const res = await api.get(`/api/sessions/messages/${sessionId}`, { params: { page: newPage, limit: 10 } });
      if (res.data.length === 0 && newPage === 1) return false;
      
      const newMsgs = res.data.reverse();
      setMessages(prev => newPage > 1 ? [...newMsgs, ...prev] : newMsgs);
      
      const sessionRes = await api.get(`/api/sessions/${sessionId}`);
      setSessionName(sessionRes.data.name || 'New Chat');
      setCurrentSubject(sessionRes.data.subject || currentSubject);
      persistData();
      return true;
    } catch (err) {
      toast.error('Messages Load Error: ' + (err.response?.data?.detail || err.message));
      return false;
    }
  };

  const sendMessage = async (text) => {
    if (!text) return;
    if (currentSubject === 'general') {
      toast.warning('First select your subject!');
      setShowSubjectModal(true);
      return;
    }
    setResponseLoading(true);
    try {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      let sessionId = currentSessionId;
      if (!sessionId) {
        const createRes = await api.post('/api/sessions/create', { subject: currentSubject });
        sessionId = createRes.data.session_id;
        setCurrentSessionId(sessionId);
      }
      const res = await api.post('/api/sessions/add-message', { session_id: sessionId, prompt: text });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      if (sessionName === 'New Chat') {
        setSessionName(res.data.session_name || 'Chat Session');
      }
      const sessionRes = await api.get(`/api/sessions/${sessionId}`);
      setCurrentSubject(sessionRes.data.subject);
    } catch (err) {
      toast.error('Chat Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResponseLoading(false);
      persistData();
    }
  };

  const persistData = () => {
    const token = Cookies.get('token');
    if (token) {
      const userId = jwtDecode(token).sub;
      localStorage.setItem(`appState_${userId}`, JSON.stringify({
        sessionId: currentSessionId,
        subject: currentSubject,
      }));
    }
  };

  const clearLocalStorage = () => {
    const token = Cookies.get('token');
    if (token) {
      const userId = jwtDecode(token).sub;
      localStorage.removeItem(`appState_${userId}`);
    } else {
      localStorage.clear();
    }
    setMessages([]);
    setCurrentSessionId(null);
    setCurrentSubject('general');
    setSessionName('New Chat');
    setPage(1);
  };

  const startNewChat = async () => {
    setMessages([]);
    setCurrentSessionId(null);
    setSessionName('New Chat');
    setPage(1);
    
    // Always force subject selection for a new chat
    setShowSubjectModal(true);
    
    try {
      const userRes = await api.get('/api/auth/me');
      setCurrentSubject(userRes.data.current_subject || 'general');
    } catch (err) {
      toast.error('Failed to refresh user data');
    }
    
    persistData();
  };

  const updateCurrentSubject = (newSubject) => {
    setCurrentSubject(newSubject);
    persistData();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl">Loading... Checking session</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} clearLocalStorage={clearLocalStorage} />} />
        <Route path="/" element={isLoggedIn ? (
          <div className="h-screen bg-gray-900 text-white flex">
            <Sidebar 
              setCurrentView={setCurrentView}
              setShowSubjectModal={setShowSubjectModal}
              setIsLoggedIn={setIsLoggedIn}
              setShowProgressModal={setShowProgressModal}
              setShowHistoryPanel={setShowHistoryPanel}
              startNewChat={startNewChat}
            />
            {showHistoryPanel && <HistoryPanel setCurrentSessionId={setCurrentSessionId} setShowHistoryPanel={setShowHistoryPanel} currentSessionId={currentSessionId} />}
            <div className="flex-1 flex flex-col">
              {currentView === 'chat' && (
                <>
                  <header className="p-4 bg-blue-600 text-white font-bold text-xl relative">
                    AI Tutor Chat
                    <div className="text-sm mt-1 flex justify-between">
                      <span>{sessionName}</span>
                      <span>{currentSubject || 'No Subject Selected'}</span>
                    </div>
                  </header>
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
                    <ChatHistory messages={messages} />
                    {responseLoading && (
                      <div className="p-3 text-center text-gray-400 animate-pulse">
                        <span>.</span><span>.</span><span>.</span>
                      </div>
                    )}
                  </div>
                  <MessageBar input={input} setInput={setInput} sendMessage={sendMessage} />
                </>
              )}
              {currentView === 'code' && <CodeDebug />}
            </div>
            {showSubjectModal && (
              <SubjectSelector 
                setShowSubjectModal={setShowSubjectModal} 
                updateCurrentSubject={updateCurrentSubject} 
              />
            )}
            {showProgressModal && <ProgressModal setShowProgressModal={setShowProgressModal} />}
            <ToastProvider />
          </div>
        ) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;