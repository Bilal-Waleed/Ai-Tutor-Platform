import React, { useState, memo } from 'react';
import { User, Edit2, Copy, Check, X, Send } from 'lucide-react';
import { toast } from 'react-toastify';

const UserMessage = memo(({ content, timestamp, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== content) {
      onEdit(editedContent.trim());
      toast.success('Message updated!');
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  return (
    <div className="flex justify-end">
      <div className="flex items-start space-x-3 max-w-3xl flex-row-reverse space-x-reverse">
        {/* Avatar */}
        <div className="w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center shrink-0 bg-gradient-to-r from-blue-500 to-blue-600">
          <User size={16} className="text-white" />
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-1 items-end">
          {isEditing ? (
            // Edit Mode
            <div className="bg-gray-700 rounded-2xl p-3 shadow-lg w-full min-w-[300px]">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full bg-gray-800 text-white p-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                >
                  <Send size={14} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          ) : (
            // Display Mode
            <>
              <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg select-text">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {content}
                </div>
              </div>
              
              {/* Timestamp and Action Buttons */}
              <div className="flex items-center space-x-2 px-2">
                {timestamp && (
                  <div className="text-xs text-gray-500">
                    {new Date(timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title="Copy message"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title="Edit message"
                >
                  <Edit2 size={12} />
                  <span className="text-xs">Edit</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

UserMessage.displayName = 'UserMessage';

export default UserMessage;

