import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MdTrendingUp, MdBarChart, MdPieChart, MdShowChart, MdRefresh, MdLightbulbOutline } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';

const QuizAnalytics = ({ setCurrentView }) => {
  const [analytics, setAnalytics] = useState({
    overallStats: {
      totalQuizzes: 0,
      averageScore: 0,
      bestSubject: '',
      improvementAreas: []
    },
    subjectPerformance: [],
    difficultyAnalysis: [],
    timeAnalysis: [],
    recentTrends: []
  });
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch quiz history and progress data
      const [quizHistoryRes, progressRes, recommendationsRes] = await Promise.all([
        api.get('/api/quiz/history'),
        api.get('/api/recommend/progress'),
        api.get('/api/quiz/recommendations')
      ]);

      const quizHistory = quizHistoryRes.data.quiz_history || [];
      const progress = progressRes.data.progress || {};
      const recommendations = recommendationsRes.data.recommendations || [];

      // Calculate overall stats
      const totalQuizzes = quizHistory.length;
      const averageScore = totalQuizzes > 0 ? quizHistory.reduce((sum, quiz) => sum + quiz.percentage, 0) / totalQuizzes : 0;

      // Find best subject
      const subjectScores = {};
      quizHistory.forEach(quiz => {
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

      // Find improvement areas
      const improvementAreas = Object.keys(subjectScores)
        .filter(subject => {
          const avgScore = subjectScores[subject].total / subjectScores[subject].count;
          return avgScore < 70;
        })
        .map(subject => ({
          subject,
          averageScore: subjectScores[subject].total / subjectScores[subject].count,
          currentProgress: progress[subject] || 0
        }));

      // Prepare chart data
      const subjectPerformance = Object.keys(subjectScores).map(subject => ({
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        averageScore: Math.round(subjectScores[subject].total / subjectScores[subject].count),
        totalQuizzes: subjectScores[subject].count,
        currentProgress: progress[subject] || 0
      }));

      const difficultyAnalysis = ['beginner', 'intermediate', 'advanced'].map(difficulty => {
        const difficultyQuizzes = quizHistory.filter(quiz => quiz.difficulty === difficulty);
        return {
          difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          count: difficultyQuizzes.length,
          averageScore: difficultyQuizzes.length > 0 
            ? Math.round(difficultyQuizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / difficultyQuizzes.length)
            : 0
        };
      });

      // Recent trends (last 10 quizzes)
      const recentTrends = quizHistory.slice(0, 10).reverse().map((quiz, index) => ({
        quiz: `Quiz ${index + 1}`,
        score: quiz.percentage,
        subject: quiz.subject.charAt(0).toUpperCase() + quiz.subject.slice(1),
        difficulty: quiz.difficulty
      }));

      // Time analysis
      const timeAnalysis = quizHistory.map(quiz => ({
        subject: quiz.subject.charAt(0).toUpperCase() + quiz.subject.slice(1),
        timeTaken: quiz.time_taken,
        score: quiz.percentage
      }));

      setAnalytics({
        overallStats: {
          totalQuizzes,
          averageScore: Math.round(averageScore),
          bestSubject,
          improvementAreas
        },
        subjectPerformance,
        difficultyAnalysis,
        timeAnalysis,
        recentTrends
      });

    } catch (error) {
      toast.error('Failed to fetch analytics: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-white">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 lg:p-6 border border-gray-700 max-h-[95vh] overflow-y-auto custom-scroll">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MdBarChart className="w-8 h-8 text-blue-400 mr-3" />
          <h2 className="text-2xl font-bold text-white">Quiz Analytics Dashboard</h2>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <MdRefresh className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Quizzes</p>
              <p className="text-2xl font-bold text-white">{analytics.overallStats.totalQuizzes}</p>
            </div>
            <MdBarChart className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Average Score</p>
              <p className="text-2xl font-bold text-white">{analytics.overallStats.averageScore}%</p>
            </div>
            <MdTrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Best Subject</p>
              <p className="text-lg font-bold text-white capitalize">{analytics.overallStats.bestSubject || 'N/A'}</p>
            </div>
            <MdPieChart className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Improvement Areas</p>
              <p className="text-lg font-bold text-white">{analytics.overallStats.improvementAreas.length}</p>
            </div>
            <MdLightbulbOutline className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subject Performance Chart */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <MdBarChart className="mr-2 text-blue-400" />
            Subject Performance
          </h3>
          {analytics.subjectPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subjectPerformance}>
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
                <Bar dataKey="averageScore" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <MdBarChart className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-lg">No quiz data yet</p>
                <p className="text-sm">Take quizzes to see performance analytics!</p>
              </div>
            </div>
          )}
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <MdPieChart className="mr-2 text-green-400" />
            Difficulty Analysis
          </h3>
          {analytics.difficultyAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.difficultyAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ difficulty, percent }) => `${difficulty} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.difficultyAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
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
                <MdPieChart className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-lg">No difficulty data</p>
                <p className="text-sm">Take quizzes to see difficulty analysis!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Trends */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <MdShowChart className="mr-2 text-purple-400" />
          Recent Performance Trends
        </h3>
        {analytics.recentTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.recentTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="quiz" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#374151', 
                  border: '1px solid #6B7280',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <MdShowChart className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-lg">No trends data</p>
              <p className="text-sm">Take more quizzes to see performance trends!</p>
            </div>
          </div>
        )}
      </div>

      {/* Improvement Areas */}
      {analytics.overallStats.improvementAreas.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <MdLightbulbOutline className="mr-2 text-red-400" />
            Areas for Improvement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.overallStats.improvementAreas.map((area, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium capitalize">{area.subject}</span>
                  <span className="text-red-400 font-bold">{Math.round(area.averageScore)}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Quiz Average</span>
                  <span className="text-sm text-gray-400">Progress: {Math.round(area.currentProgress)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${area.averageScore}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => setCurrentView('quiz')}
                  className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
                >
                  Take {area.subject} Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setCurrentView('quiz')}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
        >
          <MdTrendingUp className="w-4 h-4 mr-2" />
          Take New Quiz
        </button>
        <button 
          onClick={() => setCurrentView('quiz-history')}
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center"
        >
          <MdBarChart className="w-4 h-4 mr-2" />
          View Quiz History
        </button>
      </div>
    </div>
  );
};

export default QuizAnalytics;
