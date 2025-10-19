// src/components/HistoryPanel.jsx (Unchanged, but for completeness – calls loadMessages on switch)
import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const HistoryPanel = ({ setCurrentSessionId, setShowHistoryPanel, currentSessionId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    setCurrentSessionId(id);
    setShowHistoryPanel(false);
    toast.success('Session loaded!');
  };

  return (
    <div className="absolute left-16 top-0 h-screen w-64 bg-gray-800 p-4 overflow-y-auto shadow-lg z-50">
      <h3 className="text-white text-lg mb-4">Chat History</h3>
      {loading && <p className="text-gray-400">Loading sessions...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && sessions.length === 0 ? (
        <p className="text-gray-400">No sessions yet</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map(s => (
            <li 
              key={s.id} 
              onClick={() => loadSession(s.id)} 
              className={`cursor-pointer p-2 border-b border-gray-700 ${s.id === currentSessionId ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-300'}`}
            >
              {s.name || 'Untitled'} ({s.subject}) - {new Date(s.created_at).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
      <button 
        onClick={() => setShowHistoryPanel(false)} 
        className="mt-4 text-gray-400 hover:text-white"
      >
        Close
      </button>
    </div>
  );
};

export default HistoryPanel;