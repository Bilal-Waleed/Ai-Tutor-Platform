import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

const Login = ({ setIsLoggedIn, clearLocalStorage }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      let res;
      if (isRegister) {
        res = await api.post('/api/auth/register', form);
        toast.success('Registered successfully! Please login.');
        setIsRegister(false);
      } else {
        const formData = new URLSearchParams();
        formData.append('username', form.username);
        formData.append('password', form.password);
        
        res = await api.post('/api/auth/login', formData.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        Cookies.set('token', res.data.access_token, { expires: 7 });
        clearLocalStorage();  // Clear old data before new login
        setIsLoggedIn(true);
        toast.success('Logged in successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-lg mx-4 md:mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">{isRegister ? 'Register' : 'Login'}</h2>
        <input 
          placeholder="Username" 
          value={form.username} 
          onChange={e => setForm({...form, username: e.target.value})} 
          className="block w-full mb-4 p-3 bg-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        {isRegister && (
          <input 
            placeholder="Email" 
            type="email"
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
            className="block w-full mb-4 p-3 bg-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        )}
        <input 
          type="password" 
          placeholder="Password" 
          value={form.password} 
          onChange={e => setForm({...form, password: e.target.value})} 
          className="block w-full mb-6 p-3 bg-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <button 
          onClick={handleSubmit} 
          className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded-md text-white font-semibold transition duration-200"
        >
          {isRegister ? 'Register' : 'Login'}
        </button>
        <button 
          onClick={() => setIsRegister(!isRegister)} 
          className="w-full text-blue-400 mt-4 hover:underline"
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
};

export default Login;