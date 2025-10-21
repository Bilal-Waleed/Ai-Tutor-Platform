// src/components/MessageBar.jsx (Enhanced with better UI and functionality)
import React, { useState } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { toast } from 'react-toastify';

const MessageBar = ({ input, setInput, sendMessage }) => {
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (input.trim()) {
      try {
        await sendMessage(input);
        setInput('');
      } catch (error) {
        // Check if it's a quota exceeded error
        if (error.response?.data?.response?.includes('high demand') || 
            error.response?.data?.response?.includes('quota exceeded') ||
            error.response?.data?.response?.includes('429')) {
          toast.info('API quota exceeded. You\'re getting helpful fallback responses from our knowledge base!');
        }
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-2 lg:p-4 bg-gray-800 border-t border-gray-700">
      <div className="flex items-end space-x-2 lg:space-x-3">
        {/* Attachment Button */}
        <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
          <Paperclip size={18} className="lg:w-5 lg:h-5" />
        </button>

        {/* Voice Input Button */}
        <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
          <Mic size={18} className="lg:w-5 lg:h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            className="w-full p-2 lg:p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] lg:min-h-[44px] max-h-32 text-sm lg:text-base"
            placeholder="Type your message..."
            rows={1}
            style={{
              height: 'auto',
              minHeight: '40px',
              maxHeight: '128px'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Send Button */}
        <button 
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 lg:p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 rounded-lg text-white transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/25"
        >
          <Send size={18} className="lg:w-5 lg:h-5" />
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-1 lg:mt-2 text-xs text-gray-500 text-center">
        Press Enter to send • Shift+Enter for new line
      </div>
    </div>
  );
};

export default MessageBar;