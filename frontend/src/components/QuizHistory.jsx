import { useState, useEffect } from 'react';
import { MdHistory, MdTrendingUp, MdBarChart, MdRefresh, MdCheckCircle, MdCancel, MdTimer, MdQuiz, MdEmojiEmotions, MdThumbUp, MdTrendingUp as MdTrendingUpIcon, MdFitnessCenter } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';

const QuizHistory = ({ setCurrentView }) => {
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestSubject: '',
    improvementAreas: []
  });

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/quiz/history');
      setQuizHistory(response.data.quiz_history || []);
      
      // Calculate stats
      const history = response.data.quiz_history || [];
      const totalQuizzes = history.length;
      const averageScore = history.length > 0 ? history.reduce((sum, quiz) => sum + quiz.percentage, 0) / history.length : 0;
      
      // Find best subject
      const subjectScores = {};
      history.forEach(quiz => {
        if (!subjectScores[quiz.subject]) {
          subjectScores[quiz.subject] = { total: 0, count: 0 };
        }
        subjectScores[quiz.subject].total += quiz.percentage;
        subjectScores[quiz.subject].count += 1;
      });
      
      const bestSubject = Object.keys(subjectScores).reduce((best, subject) => {
        const avgScore = subjectScores[subject].total / subjectScores[subject].count;
        const bestAvgScore = subjectScores[best] ? subjectScores[best].total / subjectScores[best].count : 0;
        return avgScore > bestAvgScore ? subject : best;
      }, '');
      
      // Find improvement areas (subjects with low scores)
      const improvementAreas = Object.keys(subjectScores)
        .filter(subject => {
          const avgScore = subjectScores[subject].total / subjectScores[subject].count;
          return avgScore < 70;
        })
        .map(subject => ({
          subject,
          averageScore: subjectScores[subject].total / subjectScores[subject].count
        }));
      
      setStats({
        totalQuizzes,
        averageScore: Math.round(averageScore),
        bestSubject,
        improvementAreas
      });
    } catch (error) {
      toast.error('Failed to fetch quiz history: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-500/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/20';
      case 'advanced': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-white">Loading quiz history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 lg:p-6 border border-gray-700 max-h-[95vh] overflow-y-auto custom-scroll">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MdHistory className="w-8 h-8 text-blue-400 mr-3" />
          <h2 className="text-2xl font-bold text-white">Quiz History</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchQuizHistory}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <MdRefresh className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={() => setCurrentView('quiz')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center"
          >
            <MdQuiz className="w-4 h-4 mr-2" />
            Take Quiz
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Quizzes</p>
              <p className="text-2xl font-bold text-white">{stats.totalQuizzes}</p>
            </div>
            <MdBarChart className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Average Score</p>
              <p className="text-2xl font-bold text-white">{stats.averageScore}%</p>
            </div>
            <MdTrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Best Subject</p>
              <p className="text-lg font-bold text-white capitalize">{stats.bestSubject || 'N/A'}</p>
            </div>
            <MdCheckCircle className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Improvement Areas</p>
              <p className="text-lg font-bold text-white">{stats.improvementAreas.length}</p>
            </div>
            <MdCancel className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Improvement Areas */}
      {stats.improvementAreas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Areas for Improvement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.improvementAreas.map((area, index) => (
              <div key={index} className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium capitalize">{area.subject}</span>
                  <span className="text-red-400 font-bold">{Math.round(area.averageScore)}%</span>
                </div>
                <div className="w-full px-1 mt-2">
                  <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(area.averageScore, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz History List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Quiz Attempts</h3>
        {quizHistory.length === 0 ? (
          <div className="text-center py-12">
            <MdHistory className="w-20 h-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl mb-2">No quiz attempts yet</p>
            <p className="text-gray-500 text-sm mb-6">Take your first quiz to see your progress here!</p>
            <button
              onClick={() => setCurrentView('quiz')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center mx-auto"
            >
              <MdQuiz className="w-5 h-5 mr-2" />
              Start Your First Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizHistory.map((quiz, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {quiz.subject.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">{quiz.title}</h4>
                      <p className="text-gray-400 text-sm">{formatDate(quiz.completed_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(quiz.percentage)}`}>
                      {quiz.percentage.toFixed(1)}%
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatTime(quiz.time_taken)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                    </span>
                    <span className="text-gray-400">
                      Score: {quiz.score}/{quiz.max_score || 100}
                    </span>
                    <span className="text-gray-400">
                      Subject: {quiz.subject.charAt(0).toUpperCase() + quiz.subject.slice(1)}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full px-1">
                  <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${getScoreBgColor(quiz.percentage)}`}
                      style={{ width: `${Math.min(quiz.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Performance Indicator */}
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-gray-400">
                    {quiz.percentage >= 80 ? 'Excellent!' : 
                     quiz.percentage >= 60 ? 'Good!' : 
                     quiz.percentage >= 40 ? 'Needs Improvement' : 'Keep Practicing!'}
                  </span>
                  <div className="text-gray-400">
                    {quiz.percentage >= 80 ? <MdEmojiEmotions className="w-4 h-4 text-green-400" /> : 
                     quiz.percentage >= 60 ? <MdThumbUp className="w-4 h-4 text-yellow-400" /> : 
                     quiz.percentage >= 40 ? <MdTrendingUpIcon className="w-4 h-4 text-orange-400" /> : 
                     <MdFitnessCenter className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {quizHistory.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={() => setCurrentView('quiz')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
          >
            <MdQuiz className="w-4 h-4 mr-2" />
            Take Another Quiz
          </button>
          <button 
            onClick={() => setCurrentView('quiz-analytics')}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
          >
            <MdBarChart className="w-4 h-4 mr-2" />
            View Analytics
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizHistory;
