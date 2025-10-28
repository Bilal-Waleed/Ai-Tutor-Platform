import React, { memo, useCallback } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';

const ChatHistory = memo(({ messages, onEditMessage }) => {
  const handleEditMessage = useCallback((index, newContent) => {
    if (onEditMessage) {
      onEditMessage(index, newContent);
    }
  }, [onEditMessage]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-900 text-white">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">Welcome to AI Tutor!</h3>
            <p className="text-sm">Start a conversation to begin learning</p>
            <div className="mt-6 text-xs text-gray-500">
              <p className="mb-2">💡 Tips:</p>
              <ul className="space-y-1">
                <li>• Ask questions in English or Roman Urdu</li>
                <li>• Use markdown formatting for better responses</li>
                <li>• Hover over messages to copy or edit them</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <UserMessage
                content={msg.content}
                timestamp={msg.timestamp}
                onEdit={(newContent) => handleEditMessage(i, newContent)}
              />
            ) : (
              <AssistantMessage
                content={msg.content}
                timestamp={msg.timestamp}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
});

ChatHistory.displayName = 'ChatHistory';

export default ChatHistory;