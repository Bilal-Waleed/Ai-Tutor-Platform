// src/components/ProgressModal.jsx (New: Modal for recommendations, dynamic from DB)
import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProgressModal = ({ setShowProgressModal }) => {
  const [progress, setProgress] = useState({});
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get('/api/recommend/progress');  // New endpoint
        setProgress(res.data.progress || {});  // From DB, default {}
        setRecommendations(res.data.recommendations || 'No recommendations yet.');
      } catch (err) {
        toast.error('Progress Fetch Error: ' + (err.response?.data?.detail || err.message));
        setProgress({});  // Default for new user
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-gray-900/40">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full mx-4 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Your Progress</h2>
        {Object.keys(progress).length === 0 ? (
          <p className="text-gray-400">No progress yet. Start learning!</p>
        ) : (
          <ul className="space-y-2 mb-6">
            {Object.entries(progress).map(([sub, score]) => (
              <li key={sub} className="flex justify-between text-white">
                <span className="capitalize">{sub}</span>
                <span className="text-blue-400">{score}%</span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="text-xl font-semibold text-white mb-2">Recommendations</h3>
        <p className="text-gray-300">{recommendations}</p>
        <button 
          onClick={() => setShowProgressModal(false)} 
          className="mt-6 w-full bg-blue-500 hover:bg-blue-600 p-3 rounded-md text-white transition duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProgressModal;