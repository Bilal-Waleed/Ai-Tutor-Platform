import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';

const CodeDebug = ({ codeInput, setCodeInput, debugResponse, handleDebug, clearCodeUI, responseLoading }) => {
  const [language, setLanguage] = useState('python');

  const onDebugClick = () => {
    handleDebug(codeInput, language);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      <header className="p-4 bg-blue-600 text-white font-bold">Code Debugger</header>
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="w-1/2 p-4 border-r border-gray-700 flex flex-col">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)} 
            className="mb-2 p-2 bg-gray-700 text-white rounded"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
          </select>
          <Editor
            height="60vh"
            language={language}
            value={codeInput}
            onChange={setCodeInput}
            theme="vs-dark"
            options={{ minimap: { enabled: false } }}
          />
          <div className="mt-4 flex space-x-2">
            <button 
              onClick={onDebugClick} 
              disabled={responseLoading}
              className="bg-blue-500 hover:bg-blue-600 p-2 rounded text-white flex-1"
            >
              {responseLoading ? 'Analyzing...' : 'Debug Code'}
            </button>
            <button 
              onClick={clearCodeUI} 
              className="bg-red-500 hover:bg-red-600 p-2 rounded text-white flex-1"
            >
              Clear
            </button>
          </div>
        </div>
        {/* Response Panel */}
        <div className="w-1/2 p-4 overflow-y-auto">
          <h3 className="text-xl text-white mb-2">Analysis, Fix & Explanation</h3>
          <pre className="bg-gray-800 p-4 rounded text-white whitespace-pre-wrap text-sm">
            {debugResponse || 'Debug response will appear here after analysis...'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodeDebug;