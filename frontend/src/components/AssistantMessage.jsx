import React, { useState, memo } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import MessageRenderer from './MessageRenderer';
import TextToSpeech from './TextToSpeech';

const AssistantMessage = memo(({ content, timestamp }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3 max-w-3xl">
        {/* Avatar */}
        <div className="w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center shrink-0 bg-gradient-to-r from-purple-500 to-purple-600">
          <Bot size={16} className="text-white" />
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-1 items-start flex-1">
          <div className="px-4 py-3 rounded-2xl bg-gray-800 text-gray-100 shadow-lg w-full">
            <MessageRenderer content={content} />
          </div>

          {/* Timestamp, Listen, and Copy Button */}
          <div className="flex items-center space-x-2 px-2">
            {timestamp && (
              <div className="text-xs text-gray-500">
                {new Date(timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
            <TextToSpeech text={content} />
            <button
              onClick={handleCopyAll}
              className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              title="Copy message"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

AssistantMessage.displayName = 'AssistantMessage';

export default AssistantMessage;

