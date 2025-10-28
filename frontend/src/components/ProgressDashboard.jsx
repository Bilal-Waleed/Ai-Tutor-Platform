import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MdTrendingUp, MdMenuBook, MdAccessTime, MdCheckCircle, MdBarChart, MdQuiz } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProgressDashboard = ({ setShowProgressModal, setCurrentView, userPreferredSubject }) => {
  const [progress, setProgress] = useState({});
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageScore: 0,
    streakDays: 0,
    completedTopics: 0,
    totalQuizzes: 0,
    quizAverageScore: 0
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    fetchDashboardData();
  }, [userPreferredSubject]); // Re-fetch when recommendation subject changes

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch progress and recommendations with error handling for each
      let progressRes, recommendRes, sessionsRes, quizHistoryRes;
      
      try {
        progressRes = await api.get('/api/recommend/progress');
      } catch (error) {
        console.error('Progress API error:', error);
        progressRes = { data: { progress: {} } };
      }
      
      try {
        recommendRes = await api.get('/api/recommend/', {
          params: userPreferredSubject && userPreferredSubject !== 'general' ? { subject: userPreferredSubject } : {}
        });
      } catch (error) {
        console.error('Recommendations API error:', error);
        recommendRes = { data: { recommendations: 'No recommendations available.' } };
      }
      
      try {
        sessionsRes = await api.get('/api/sessions/list');
      } catch (error) {
        console.error('Sessions API error:', error);
        sessionsRes = { data: [] };
      }
      
      try {
        quizHistoryRes = await api.get('/api/quiz/history');
      } catch (error) {
        console.error('Quiz history API error:', error);
        quizHistoryRes = { data: { quiz_history: [] } };
      }

      setProgress(progressRes.data.progress || {});
      setRecommendations(recommendRes.data.recommendations || 'No recommendations yet.');
      
      // Set sessions data
      const sessionsData = sessionsRes.data || [];
      setSessions(sessionsData);
      
      // Calculate stats
      const sessions = sessionsData;
      const quizHistory = quizHistoryRes.data.quiz_history || [];
      const totalSessions = sessions.length;
      const totalQuizzes = quizHistory.length;
      
      // Calculate quiz average score from quiz history
      const quizAverageScore = totalQuizzes > 0 ? quizHistory.reduce((sum, quiz) => sum + quiz.percentage, 0) / totalQuizzes : 0;
      
      // Calculate progress average score from user's progress field
      const progressScores = Object.values(progressRes.data.progress || {});
      const progressAverageScore = progressScores.length > 0 ? progressScores.reduce((sum, score) => sum + score, 0) / progressScores.length : 0;
      
      // Calculate completed topics based on sessions (more realistic)
      const uniqueSubjects = new Set(sessions.map(session => session.subject));
      const completedTopics = uniqueSubjects.size;
      
      // Calculate streak days based on recent activity
      const today = new Date();
      const recentSessions = sessions.filter(session => {
        const sessionDate = new Date(session.created_at);
        const daysDiff = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7; // Last 7 days
      });
      const streakDays = recentSessions.length > 0 ? Math.min(recentSessions.length, 7) : 0;
      
      setStats({
        totalSessions,
        averageScore: Math.round(progressAverageScore), // Use progress average from user's progress field
        streakDays: streakDays, // Real streak calculation
        completedTopics: completedTopics, // Based on actual sessions
        totalQuizzes,
        quizAverageScore: Math.round(quizAverageScore) // Separate quiz average
      });
      
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Create chart data from sessions and quiz history instead of progress
  const sessionSubjects = sessions.map(session => session.subject);
  const subjectCounts = sessionSubjects.reduce((acc, subject) => {
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(subjectCounts).map(([subject, count]) => ({
    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
    score: count * 10, // Convert session count to a score-like metric
    fill: COLORS[Object.keys(subjectCounts).indexOf(subject) % COLORS.length]
  }));

  const pieData = Object.entries(subjectCounts).map(([subject, count], index) => ({
    name: subject.charAt(0).toUpperCase() + subject.slice(1),
    value: count,
    fill: COLORS[index % COLORS.length]
  }));

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-gray-900/40">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-white">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback UI if no data is available
  if (sessions.length === 0 && stats.totalSessions === 0 && stats.totalQuizzes === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-gray-900/40 p-2 lg:p-4">
        <div className="bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg max-w-2xl w-full mx-2 lg:mx-4 border border-gray-700">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl lg:text-3xl font-bold text-white flex items-center">
              <MdTrendingUp className="mr-2 lg:mr-3 text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
              Learning Dashboard
            </h2>
            <button 
              onClick={() => setShowProgressModal(false)} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Empty State */}
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MdTrendingUp className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Welcome to Your Learning Dashboard!</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start learning to see your progress, take quizzes, and get personalized recommendations.
            </p>
            
            {/* Quick Start Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => setCurrentView('quiz')}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white transition-colors flex items-center justify-center"
              >
                <MdQuiz className="w-5 h-5 mr-2" />
                Start Learning with Quiz
              </button>
              <button 
                onClick={() => setCurrentView('chat')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors flex items-center justify-center"
              >
                <MdMenuBook className="w-5 h-5 mr-2" />
                Start Chat Learning
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button 
              onClick={fetchDashboardData}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
            >
              <MdTrendingUp className="w-4 h-4 mr-2" />
              Refresh Data
            </button>
            <button 
              onClick={() => setShowProgressModal(false)}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white transition-colors"
            >
              Close Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-gray-900/40 p-2 lg:p-4">
      <div className="bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg max-w-6xl w-full mx-2 lg:mx-4 border border-gray-700 max-h-[95vh] lg:max-h-[90vh] overflow-y-auto custom-scroll">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 lg:mb-6">
          <h2 className="text-xl lg:text-3xl font-bold text-white flex items-center">
            <MdTrendingUp className="mr-2 lg:mr-3 text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
            <span className="hidden sm:inline">Learning Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </h2>
          <button 
            onClick={() => setShowProgressModal(false)} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs lg:text-sm">Total Sessions</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.totalSessions}</p>
              </div>
              <MdMenuBook className="w-6 h-6 lg:w-8 lg:h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs lg:text-sm">Progress Score</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.averageScore}%</p>
              </div>
              <MdBarChart className="w-6 h-6 lg:w-8 lg:h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs lg:text-sm">Streak Days</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.streakDays}</p>
              </div>
              <MdAccessTime className="w-6 h-6 lg:w-8 lg:h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs lg:text-sm">Topics Completed</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.completedTopics}</p>
              </div>
              <MdCheckCircle className="w-6 h-6 lg:w-8 lg:h-8 text-orange-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-xs lg:text-sm">Total Quizzes</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.totalQuizzes}</p>
              </div>
              <MdQuiz className="w-6 h-6 lg:w-8 lg:h-8 text-cyan-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-600 to-pink-700 p-3 lg:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-xs lg:text-sm">Quiz Performance</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{stats.quizAverageScore}%</p>
              </div>
              <MdTrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-pink-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Progress Chart */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <MdCheckCircle className="mr-2 text-green-400" />
              Learning Activity by Subject
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="subject" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#374151', 
                      border: '1px solid #6B7280',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <MdMenuBook className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-lg">No learning activity yet</p>
                  <p className="text-sm">Start a chat session to see your activity!</p>
                </div>
              </div>
            )}
          </div>

          {/* Subject Distribution */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <MdBarChart className="mr-2 text-blue-400" />
              Session Distribution
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#374151', 
                      border: '1px solid #6B7280',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <MdBarChart className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-lg">No sessions yet</p>
                  <p className="text-sm">Start chatting to see session distribution!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <MdTrendingUp className="mr-2 text-blue-400" />
              AI Recommendations
            </h3>
            {userPreferredSubject && userPreferredSubject !== 'general' && (
              <span className="text-xs bg-blue-500/30 px-3 py-1 rounded-full text-blue-300">
                Focus: {userPreferredSubject.charAt(0).toUpperCase() + userPreferredSubject.slice(1)}
              </span>
            )}
          </div>
          <p className="text-gray-200 leading-relaxed">{recommendations}</p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={() => setCurrentView('quiz')}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
          >
            <MdQuiz className="w-4 h-4 mr-2" />
            Take Quiz
          </button>
          <button 
            onClick={() => setCurrentView('quiz-analytics')}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
          >
            <MdBarChart className="w-4 h-4 mr-2" />
            Quiz Analytics
          </button>
          <button 
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
          >
            <MdTrendingUp className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
          <button 
            onClick={() => setShowProgressModal(false)}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
