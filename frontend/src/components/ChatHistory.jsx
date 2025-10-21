
import { User, Bot, Clock } from 'lucide-react';

import { formatTime as formatTimeUtil, testPakistanTimezone } from '../utils/timeUtils';

const ChatHistory = ({ messages }) => {
  const formatTime = (timestamp) => {
    return formatTimeUtil(timestamp);
  };

  // Test Pakistan timezone conversion
  const timezoneTest = testPakistanTimezone();
  console.log('Pakistan Timezone Test:', timezoneTest);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-900 text-white">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">Welcome to AI Tutor!</h3>
            <p className="text-sm">Start a conversation to begin learning</p>
          </div>
        </div>
      ) : (
        messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-3 max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-r from-purple-500 to-purple-600'
              }`}>
                {msg.role === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                } shadow-lg`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
                
                {/* Timestamp */}
                {msg.timestamp && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ChatHistory;