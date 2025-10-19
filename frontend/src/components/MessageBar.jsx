// src/components/MessageBar.jsx (Fixed input clear after send; modern look)
import React from 'react';

const MessageBar = ({ input, setInput, sendMessage }) => {
  const handleSend = () => {
    sendMessage(input);
    setInput('');  
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700 flex">
      <input 
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        className="flex-1 p-2 bg-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        placeholder="Ask..." 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSend();
          }
        }} 
      />
      <button onClick={handleSend} className="p-2 ml-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white transition duration-200">
        Send
      </button>
    </div>
  );
};

export default MessageBar;