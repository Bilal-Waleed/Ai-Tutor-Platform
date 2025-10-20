import { useState, useEffect } from 'react';
import { MdLightbulbOutline, MdTrendingUp, MdMenuBook, MdArrowForward, MdMessage, MdCode, MdCalculate, MdScience, MdBook } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';

const RecommendationsWidget = ({ setCurrentView, setShowSubjectModal, startNewChat }) => {
  const [recommendations, setRecommendations] = useState('');
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const [recommendRes, progressRes] = await Promise.all([
        api.get('/api/recommend/'),
        api.get('/api/recommend/progress')
      ]);
      
      setRecommendations(recommendRes.data.recommendations || 'Start learning to get personalized recommendations!');
      setProgress(progressRes.data.progress || {});
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations('Unable to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    const subjects = Object.keys(progress);
    const actions = [];
    
    if (subjects.length === 0) {
      actions.push({
        label: 'Start Learning',
        icon: MdBook,
        action: () => {
          setShowSubjectModal(true);
          toast.info('Select a subject to begin learning!');
        },
        color: 'text-blue-400'
      });
    } else {
      const weakestSubject = subjects.reduce((min, subject) => 
        (progress[subject] || 0) < (progress[min] || 0) ? subject : min
      );
      
      // Subject-specific actions
      const subjectActions = {
        coding: {
          icon: MdCode,
          color: 'text-green-400',
          actions: [
            { label: 'Practice Coding', action: () => setCurrentView('code') },
            { label: 'Ask Coding Questions', action: () => setCurrentView('chat') },
            { label: 'Take Coding Quiz', action: () => setCurrentView('quiz') }
          ]
        },
        math: {
          icon: MdCalculate,
          color: 'text-blue-400',
          actions: [
            { label: 'Math Problems', action: () => setCurrentView('chat') },
            { label: 'Ask Math Questions', action: () => setCurrentView('chat') },
            { label: 'Take Math Quiz', action: () => setCurrentView('quiz') }
          ]
        },
        ielts: {
          icon: MdBook,
          color: 'text-purple-400',
          actions: [
            { label: 'IELTS Practice', action: () => setCurrentView('chat') },
            { label: 'Writing Tips', action: () => setCurrentView('chat') },
            { label: 'Take IELTS Quiz', action: () => setCurrentView('quiz') }
          ]
        },
        physics: {
          icon: MdScience,
          color: 'text-orange-400',
          actions: [
            { label: 'Physics Problems', action: () => setCurrentView('chat') },
            { label: 'Ask Physics Questions', action: () => setCurrentView('chat') },
            { label: 'Take Physics Quiz', action: () => setCurrentView('quiz') }
          ]
        }
      };
      
      const currentSubjectActions = subjectActions[weakestSubject] || subjectActions.coding;
      
      actions.push(
        {
          label: `Focus on ${weakestSubject.charAt(0).toUpperCase() + weakestSubject.slice(1)}`,
          icon: currentSubjectActions.icon,
          action: () => {
            setCurrentView('chat');
            toast.info(`Let's work on ${weakestSubject}!`);
          },
          color: currentSubjectActions.color
        },
        {
          label: 'New Chat Session',
          icon: MdMessage,
          action: () => {
            startNewChat();
            toast.info('Starting new learning session!');
          },
          color: 'text-green-400'
        },
        {
          label: 'Start Learning with Quiz',
          icon: MdMenuBook,
          action: () => {
            setCurrentView('quiz');
            toast.info('Starting quiz-based learning!');
          },
          color: 'text-blue-400'
        }
      );
    }
    
    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <MdLightbulbOutline className="w-5 h-5 text-yellow-400 mr-2" />
          <h3 className="text-sm font-semibold text-white">AI Recommendations</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <MdTrendingUp className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Recommendations Text */}
      <div className="mb-3">
        {loading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        ) : (
          <p className="text-xs text-gray-300 leading-relaxed">
            {recommendations.length > 100 && !expanded 
              ? `${recommendations.substring(0, 100)}...` 
              : recommendations
            }
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="w-full flex items-center justify-between p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
            >
              <div className="flex items-center">
                <Icon className={`w-4 h-4 mr-2 ${action.color}`} />
                <span className="text-xs text-gray-200 group-hover:text-white transition-colors">
                  {action.label}
                </span>
              </div>
              <MdArrowForward className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Progress Summary */}
      {Object.keys(progress).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Progress Summary</span>
            <span className="text-xs text-blue-400">
              {Object.keys(progress).length} subjects
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(progress).slice(0, 3).map(([subject, score]) => (
              <div key={subject} className="flex items-center justify-between">
                <span className="text-xs text-gray-300 capitalize">{subject}</span>
                <div className="flex items-center">
                  <div className="w-16 bg-gray-600 rounded-full h-1.5 mr-2">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(score || 0, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {Math.round(score || 0)}%
                  </span>
                </div>
              </div>
            ))}
            {Object.keys(progress).length > 3 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{Object.keys(progress).length - 3} more subjects
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchRecommendations}
        disabled={loading}
        className="w-full mt-3 p-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center"
      >
        <MdTrendingUp className="w-3 h-3 mr-1 text-blue-400" />
        <span className="text-xs text-blue-400">Refresh</span>
      </button>
    </div>
  );
};

export default RecommendationsWidget;
