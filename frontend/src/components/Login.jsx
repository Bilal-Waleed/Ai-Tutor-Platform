import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { User, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

const Login = ({ setIsLoggedIn, clearLocalStorage }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isRegister && !form.email.trim()) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isRegister) {
        res = await api.post('/api/auth/register', form);
        toast.success('Registered successfully! Please login.');
        setIsRegister(false);
        setForm({ username: '', email: '', password: '' });
      } else {
        const formData = new URLSearchParams();
        formData.append('username', form.username);
        formData.append('password', form.password);
        
        res = await api.post('/api/auth/login', formData.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        Cookies.set('token', res.data.access_token, { expires: 7 });
        clearLocalStorage();
        setIsLoggedIn(true);
        toast.success('Logged in successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Tutor</h1>
          <p className="text-gray-300">Your intelligent learning companion</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <div className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                placeholder="Username" 
                value={form.username} 
                onChange={e => setForm({...form, username: e.target.value})} 
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm" 
              />
            </div>

            {/* Email (Register only) */}
            {isRegister && (
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  placeholder="Email" 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm" 
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 py-3 rounded-lg text-white font-semibold transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/25"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isRegister ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>

          {/* Toggle */}
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="w-full text-blue-300 mt-4 hover:text-blue-200 transition-colors text-center"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Create One'}
          </button>
        </div>

        {/* Features */}
        <div className="mt-8 text-center text-gray-300">
          <p className="text-sm">✨ AI-powered tutoring • 📚 Multiple subjects • 🔧 Code debugging</p>
        </div>
      </div>
    </div>
  );
};

export default Login;