import { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const SubjectSelector = ({ setShowSubjectModal, updateCurrentSubject, onSubjectChange, onModalClose, context = 'chat' }) => {
  const [subject, setSubject] = useState('');

  const handleSelect = async () => {
    if (!subject) {
      toast.warning('Please select a subject');
      return;
    }
    try {
      // Only update backend if context is 'chat' (for new chats)
      // For recommendations, we just update local state
      if (context === 'chat') {
        await api.post('/api/auth/select-subject', { subject: subject });
        const userRes = await api.get('/api/auth/me');
        const newSubject = userRes.data.current_subject;
        updateCurrentSubject(newSubject);
        toast.success('Chat subject set successfully!');
      } else {
        // Just update recommendation subject locally
        updateCurrentSubject(subject);
        toast.success('Recommendation focus updated!');
      }
      
      // Trigger callback
      if (onSubjectChange) {
        onSubjectChange(subject);
      }
      
      setShowSubjectModal(false);
    } catch (err) {
      toast.error('Subject Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getModalTitle = () => {
    if (context === 'chat') {
      return {
        title: 'Select Chat Subject',
        subtitle: 'Choose a subject for this chat session'
      };
    } else {
      return {
        title: 'Select Learning Focus',
        subtitle: 'Choose a subject for AI recommendations'
      };
    }
  };

  const modalContent = getModalTitle();

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-gray-900/40" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowSubjectModal(false);
        if (onModalClose) {
          onModalClose();
        }
      }
    }}>
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg max-w-sm w-full mx-4 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2 text-center">{modalContent.title}</h2>
        <p className="text-xs text-gray-400 mb-4 text-center">{modalContent.subtitle}</p>
        <select 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
          className="w-full mb-4 p-3 bg-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose one</option>
          <option value="math">Math</option>
          <option value="coding">Coding</option>
          <option value="ielts">IELTS</option>
          <option value="physics">Physics</option>
        </select>
        <div className="flex justify-between">
          <button onClick={handleSelect} className="bg-blue-500 hover:bg-blue-600 p-3 rounded-md text-white flex-1 mr-2 transition">Set</button>
          <button onClick={() => {
            setShowSubjectModal(false);
            if (onModalClose) {
              onModalClose();
            }
          }} className="bg-gray-600 hover:bg-gray-700 p-3 rounded-md text-white flex-1 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelector;