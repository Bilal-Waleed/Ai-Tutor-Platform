# AI Tutor Platform 🚀

A comprehensive AI-powered tutoring platform built with FastAPI backend and React frontend, featuring intelligent code debugging, multi-subject learning, and session management.

## ✨ Features

### 🎯 Core Features
- **AI-Powered Chat**: Intelligent conversations with Llama 3.1 8B model
- **Code Debugging**: Real-time code analysis and debugging for Python, JavaScript, and Java
- **Multi-Subject Support**: Math, Coding, IELTS, Physics tutoring
- **Session Management**: Persistent chat and code debugging sessions
- **Progress Tracking**: User performance monitoring and recommendations
- **History Management**: Complete session history with search and retrieval

### 🎨 UI/UX Features
- **Modern Design**: Beautiful gradient-based interface with glassmorphism effects
- **Responsive Layout**: Mobile-friendly design with adaptive components
- **Real-time Updates**: Live typing indicators and status updates
- **Interactive Elements**: Smooth animations and hover effects
- **Dark Theme**: Professional dark mode interface

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── main.py                 # FastAPI application entry point
├── db.py                   # Database configuration
├── models/                 # SQLAlchemy models
│   ├── user.py            # User model
│   ├── session.py         # Chat session model
│   ├── message.py         # Message model
│   └── code_session.py    # Code debugging session model
├── routers/               # API routes
│   ├── auth.py            # Authentication endpoints
│   ├── sessions.py        # Chat session management
│   ├── code_debug.py      # Code debugging endpoints
│   ├── qa.py              # Q&A endpoints
│   └── recommend.py       # Recommendations
└── services/              # Business logic
    ├── llm_service.py     # AI model integration
    └── voice_service.py   # Voice processing (optional)
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── Login.jsx      # Authentication UI
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   ├── ChatHistory.jsx # Chat display
│   │   ├── MessageBar.jsx # Message input
│   │   ├── CodeDebug.jsx  # Code debugging interface
│   │   └── ...
│   ├── services/          # API services
│   │   └── api.js         # Axios configuration
│   └── App.jsx           # Main application component
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-tutor-platform
```

2. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Environment Configuration**
Create `.env` file in backend directory:
```env
DB_PASSWORD=your_postgres_password
SECRET_KEY=your_jwt_secret_key_here
```

5. **Database Setup**
```bash
# Create PostgreSQL database
createdb aittutor

# Run the application (tables will be created automatically)
python main.py
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:8000
```

4. **Start development server**
```bash
npm run dev
```

## 🔧 Configuration

### Model Configuration
The AI model path is configured in `backend/services/llm_service.py`:
```python
model_path = r"C:\Users\ESHOP\Desktop\revotic ai\Task 2\ai-tutor-platform\backend\data\llama\Meta-Llama-3.1-8B-Instruct-Q2_K.gguf"
```

### Database Configuration
Database connection is configured in `backend/db.py`:
```python
SQLALCHEMY_DATABASE_URL = f"postgresql://postgres:{DB_PASSWORD}@localhost:5432/aittutor"
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/select-subject` - Update user subject

### Chat Sessions
- `POST /api/sessions/create` - Create new chat session
- `GET /api/sessions/list` - Get user sessions
- `GET /api/sessions/{id}` - Get specific session
- `POST /api/sessions/add-message` - Add message to session
- `GET /api/sessions/messages/{id}` - Get session messages

### Code Debugging
- `POST /api/code/debug` - Debug code
- `GET /api/code/sessions` - Get code sessions
- `GET /api/code/sessions/{id}` - Get specific code session
- `DELETE /api/code/sessions/{id}` - Delete code session

### Recommendations
- `GET /api/recommend/` - Get learning recommendations
- `GET /api/recommend/progress` - Get user progress
- `POST /api/recommend/update-progress` - Update progress

## 🎯 Usage Guide

### 1. Authentication
- Register a new account or login with existing credentials
- Select your preferred subject (Math, Coding, IELTS, Physics)

### 2. Chat Interface
- Start conversations with the AI tutor
- Ask questions related to your selected subject
- View chat history and continue previous sessions

### 3. Code Debugging
- Switch to Code Debug view from the sidebar
- Write code in Python, JavaScript, or Java
- Get AI-powered analysis, error detection, and suggestions
- View debugging history and load previous sessions

### 4. Progress Tracking
- Monitor your learning progress
- Get personalized recommendations
- Track performance across different subjects

## 🛠️ Development

### Adding New Features
1. **Backend**: Add new routes in `routers/` directory
2. **Frontend**: Create components in `src/components/`
3. **Database**: Update models in `models/` directory

### Code Style
- Backend: Follow PEP 8 Python style guide
- Frontend: Use ESLint configuration
- Use meaningful commit messages

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Model Loading Error**
   - Ensure Llama model file exists at specified path
   - Check file permissions
   - Verify model format (GGUF)

3. **Frontend Build Error**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

4. **CORS Issues**
   - Ensure frontend URL is added to CORS origins
   - Check API URL configuration

## 📈 Performance Optimization

### Backend
- Model caching for faster responses
- Database query optimization
- Response compression
- Rate limiting implementation

### Frontend
- Component lazy loading
- Image optimization
- Bundle size optimization
- Caching strategies

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- SQL injection prevention

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ using FastAPI, React, and AI**
