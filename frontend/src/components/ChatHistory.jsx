
const ChatHistory = ({ messages }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 text-white">
    {messages.map((msg, i) => (
      <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'}`}>
        {msg.content}
      </div>
    ))}
  </div>
);
export default ChatHistory;