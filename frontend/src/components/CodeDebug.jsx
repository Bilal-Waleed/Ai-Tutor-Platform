import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import api from '../services/api';

const CodeDebug = () => {
  const [codeInput, setCodeInput] = useState('');
  const [language, setLanguage] = useState('python');
  const [debugResponse, setDebugResponse] = useState('');
  const [debugResponseRoman, setDebugResponseRoman] = useState('');
  const [showRoman, setShowRoman] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);
  const [codeSessions, setCodeSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load code sessions on component mount
  useEffect(() => {
    loadCodeSessions();
  }, []);

  const loadCodeSessions = async () => {
    try {
      const response = await api.get('/api/code/sessions');
      setCodeSessions(response.data);
    } catch (error) {
      console.error('Failed to load code sessions:', error);
    }
  };

  const handleDebug = async () => {
    if (!codeInput.trim()) {
      toast.warning('Please enter some code to debug');
      return;
    }

    setResponseLoading(true);
    try {
      const response = await api.post('/api/code/debug', {
        code: codeInput,
        language: language
      });

      setDebugResponse(response.data.response);
      setDebugResponseRoman(response.data.response_roman || '');
      toast.success(`Code analyzed! Session: ${response.data.session_name}`);
      
      // Reload sessions to show new one
      loadCodeSessions();
      
    } catch (error) {
      toast.error('Debug failed: ' + (error.response?.data?.detail || error.message));
      setDebugResponse('Error occurred while analyzing code.');
    } finally {
      setResponseLoading(false);
    }
  };

  const clearCodeUI = () => {
    setCodeInput('');
    setDebugResponse('');
    setDebugResponseRoman('');
    setShowRoman(false);
    setSelectedSession(null);
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await api.get(`/api/code/sessions/${sessionId}`);
      const session = response.data;
      
      setCodeInput(session.code_input);
      setLanguage(session.language);
      setDebugResponse(session.response);
      setDebugResponseRoman(session.response_roman || '');
      setSelectedSession(session);
      setShowHistory(false);
      
      toast.success(`Loaded session: ${session.name}`);
    } catch (error) {
      toast.error('Failed to load session: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/api/code/sessions/${sessionId}`);
      toast.success('Session deleted successfully');
      loadCodeSessions();
      
      // Clear UI if deleted session was selected
      if (selectedSession && selectedSession.id === sessionId) {
        clearCodeUI();
      }
    } catch (error) {
      toast.error('Failed to delete session: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex-shrink-0 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold flex justify-between items-center">
        <div>
          <h1 className="text-xl">Code Debugger</h1>
          <p className="text-sm opacity-90">Analyze, debug, and improve your code</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* History Panel */}
        {showHistory && (
          <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="text-lg font-semibold text-white">Code Sessions</h3>
              <p className="text-sm text-gray-400">{codeSessions.length} sessions</p>
            </div>
            
            {/* Scrollable Content - Takes remaining space */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll bg-gray-800">
              {codeSessions.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-lg mb-2">No code sessions yet</p>
                  <p className="text-sm">Start debugging to create your first session!</p>
                </div>
              ) : (
                <div className="p-3 space-y-3 pb-6">
                  {codeSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`relative p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 min-h-[120px] ${
                        selectedSession?.id === session.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => loadSession(session.id)}
                    >
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-500 hover:text-white transition-colors text-red-400 hover:text-white z-10"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      
                      {/* Session Content */}
                      <div className="pr-8">
                        <h4 className="font-semibold text-sm mb-2 truncate" title={session.name}>
                          {session.name}
                        </h4>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-600 text-xs rounded-full">
                            {session.language}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-300 line-clamp-3 break-words" title={session.code_preview}>
                          {session.code_preview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Editor Panel */}
          <div className="w-1/2 p-4 border-r border-gray-700 flex flex-col min-h-0">
            <div className="mb-4 flex items-center space-x-4">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                className="p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
              </select>
              
              {selectedSession && (
                <div className="text-sm text-blue-400">
                  Loaded: {selectedSession.name}
                </div>
              )}
            </div>

            <div className="flex-1 border border-gray-600 rounded-lg overflow-hidden">
              <Editor
                height="100%"
                language={language}
                value={codeInput}
                onChange={setCodeInput}
                theme="vs-dark"
                options={{ 
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true
                }}
              />
            </div>

            <div className="mt-4 flex space-x-3">
              <button 
                onClick={handleDebug} 
                disabled={responseLoading || !codeInput.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 p-3 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center"
              >
                {responseLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  'Debug Code'
                )}
              </button>
              <button 
                onClick={clearCodeUI} 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 p-3 rounded-lg text-white font-medium transition-all duration-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Response Panel */}
          <div className="w-1/2 p-4 flex flex-col min-h-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Analysis & Explanation</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Language:</span>
                <button
                  onClick={() => setShowRoman(false)}
                  className={`px-2 py-1 rounded text-xs ${!showRoman ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
                >English</button>
                <button
                  onClick={() => setShowRoman(true)}
                  className={`px-2 py-1 rounded text-xs ${showRoman ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
                >Roman Urdu</button>
              </div>
            </div>
            
            <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto custom-scroll">
              {(showRoman ? debugResponseRoman : debugResponse) ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed">
                    {showRoman ? debugResponseRoman : debugResponse}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-lg">Ready to analyze your code</p>
                    <p className="text-sm">Enter your code and click "Debug Code" to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeDebug;