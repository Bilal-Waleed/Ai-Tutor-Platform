import { useState, useEffect } from 'react';
import { MdQuiz, MdTimer, MdCheckCircle, MdCancel, MdRefresh, MdTrendingUp, MdLightbulbOutline } from 'react-icons/md';
import api from '../services/api';
import { toast } from 'react-toastify';

const QuizSystem = ({ setCurrentView }) => {
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStatus, setQuizStatus] = useState('idle'); // idle, active, completed
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchQuizRecommendations();
  }, []);

  useEffect(() => {
    if (quizStatus === 'active' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizStatus === 'active') {
      submitQuiz();
    }
  }, [timeLeft, quizStatus]);

  const fetchQuizRecommendations = async () => {
    try {
      const response = await api.get('/api/quiz/recommendations');
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch quiz recommendations:', error);
    }
  };

  const createQuiz = async (subject, difficulty, quizType = 'mixed') => {
    try {
      setLoading(true);
      const response = await api.post('/api/quiz/create', {
        subject,
        difficulty,
        quiz_type: quizType,
        total_questions: 10,
        time_limit: 600 // 10 minutes
      });

      const quizData = response.data;
      setCurrentQuiz(quizData);
      
      // Fetch quiz questions
      const questionsResponse = await api.get(`/api/quiz/${quizData.quiz_id}/questions`);
      setQuestions(questionsResponse.data.questions);
      setTimeLeft(questionsResponse.data.time_limit);
      setQuizStatus('active');
      setCurrentQuestionIndex(0);
      setAnswers({});
      
      toast.success(`Quiz created! ${quizData.total_questions} questions, ${Math.floor(quizData.time_limit / 60)} minutes`);
    } catch (error) {
      toast.error('Failed to create quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      setLoading(true);
      
      const quizAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        user_answer: answer,
        time_taken: 0 // Could implement per-question timing
      }));

      const response = await api.post('/api/quiz/submit', {
        quiz_id: currentQuiz.quiz_id,
        answers: quizAnswers
      });

      setQuizResult(response.data);
      setQuizStatus('completed');
      toast.success(`Quiz completed! Score: ${response.data.percentage.toFixed(1)}%`);
      
      // Refresh recommendations after quiz completion
      fetchQuizRecommendations();
    } catch (error) {
      toast.error('Failed to submit quiz: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startNewQuiz = () => {
    setCurrentQuiz(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(0);
    setQuizStatus('idle');
    setQuizResult(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'bg-blue-500/20 border-blue-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  if (quizStatus === 'completed' && quizResult) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {/* Quiz Results */}
        <div className="text-center mb-6">
          <MdCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h2>
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {quizResult.percentage.toFixed(1)}%
          </div>
          <p className="text-gray-300">
            {quizResult.correct_answers} out of {quizResult.total_questions} questions correct
          </p>
        </div>

        {/* Detailed Results */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Question Review</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {quizResult.detailed_results.map((result, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                result.is_correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Question {index + 1}</span>
                  <span className={`text-sm font-medium ${
                    result.is_correct ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.points_earned}/{result.max_points} points
                  </span>
                </div>
                <p className="text-sm text-gray-200 mb-1">{result.question_text}</p>
                <div className="text-xs text-gray-400">
                  <span className="text-blue-400">Your answer:</span> {result.user_answer}
                </div>
                {!result.is_correct && (
                  <div className="text-xs text-gray-400 mt-1">
                    <span className="text-green-400">Correct answer:</span> {result.correct_answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress Update */}
        {quizResult.progress_updated && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <MdTrendingUp className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-blue-400 font-medium">
                Progress Updated: {quizResult.progress_updated}%
              </span>
            </div>
            <p className="text-sm text-gray-300 mt-1">{quizResult.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={startNewQuiz}
            className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center"
          >
            <MdRefresh className="w-4 h-4 mr-2" />
            Take Another Quiz
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white transition-colors"
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (quizStatus === 'active' && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="bg-gray-800 rounded-lg p-4 lg:p-6 border border-gray-700 max-h-[95vh] overflow-y-auto custom-scroll">
        {/* Quiz Header */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-white">{currentQuiz.title}</h2>
            <p className="text-xs lg:text-sm text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="flex items-center text-yellow-400">
              <MdTimer className="w-4 h-4 lg:w-5 lg:h-5 mr-1" />
              <span className="font-mono text-sm lg:text-lg">{formatTime(timeLeft)}</span>
            </div>
            <div className="text-xs lg:text-sm text-gray-400">
              {currentQuestion.points} points
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-600 rounded-full h-2 mb-4 lg:mb-6">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Question */}
        <div className="mb-4 lg:mb-6">
          <div className="bg-gray-700 rounded-lg p-3 lg:p-4 mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-white mb-2">
              {currentQuestion.question_text}
            </h3>
            <div className="text-xs lg:text-sm text-gray-400">
              Type: {currentQuestion.question_type.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {/* Answer Input */}
          {currentQuestion.question_type === 'multiple_choice' ? (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => (
                <label key={index} className="flex items-center p-2 lg:p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`question_${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="mr-2 lg:mr-3 text-blue-500"
                  />
                  <span className="text-gray-200 text-sm lg:text-base">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Enter your answer here..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none text-sm lg:text-base"
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-3 lg:px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors text-sm lg:text-base"
          >
            Previous
          </button>
          
          <div className="flex flex-wrap justify-center gap-1 lg:gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full text-xs lg:text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-blue-500 text-white'
                    : answers[questions[index].id]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={loading}
              className="px-4 lg:px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white transition-colors flex items-center text-sm lg:text-base"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <MdCheckCircle className="w-4 h-4 mr-2" />
              )}
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors text-sm lg:text-base"
            >
              Next
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz Selection Screen
  return (
    <div className="bg-gray-800 rounded-lg p-4 lg:p-6 border border-gray-700 max-h-[95vh] overflow-y-auto custom-scroll">
      <div className="flex items-center mb-4 lg:mb-6">
        <MdQuiz className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400 mr-2 lg:mr-3" />
        <h2 className="text-xl lg:text-2xl font-bold text-white">AI-Powered Quiz System</h2>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <MdLightbulbOutline className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Recommended Quizzes</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {recommendations.map((rec, index) => (
              <div key={index} className={`p-3 lg:p-4 rounded-lg border ${getPriorityColor(rec.priority)} hover:shadow-lg transition-all duration-200`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white capitalize text-sm lg:text-base">{rec.subject}</h4>
                  <span className={`text-xs lg:text-sm font-medium px-2 py-1 rounded-full ${getDifficultyColor(rec.difficulty)}`}>
                    {rec.difficulty}
                  </span>
                </div>
                <p className="text-xs lg:text-sm text-gray-300 mb-3">{rec.reason}</p>
                <button
                  onClick={() => createQuiz(rec.subject, rec.difficulty, rec.quiz_type)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white text-xs lg:text-sm transition-colors font-medium"
                >
                  {loading ? 'Creating...' : 'Start Quiz'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Quiz Creation */}
      <div className="border-t border-gray-700 pt-4 lg:pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Create Custom Quiz</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {['coding', 'math', 'ielts', 'physics'].map(subject => (
            <div key={subject} className="bg-gray-700 rounded-lg p-3 lg:p-4 hover:bg-gray-600 transition-colors">
              <h4 className="font-semibold text-white capitalize mb-3 text-sm lg:text-base">{subject}</h4>
              <div className="space-y-2">
                {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => createQuiz(subject, difficulty)}
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg text-xs lg:text-sm transition-colors font-medium ${
                      difficulty === 'beginner' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : difficulty === 'intermediate'
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white disabled:opacity-50`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizSystem;
