# 🎨 Realtime Collaboration Whiteboard

A full-stack web application that enables real-time collaborative drawing and brainstorming sessions. Users can create whiteboard sessions, invite others to collaborate, and draw together in real-time with live presence indicators.

![Realtime Whiteboard Demo](https://via.placeholder.com/800x400/4f46e5/ffffff?text=Realtime+Collaboration+Whiteboard)

## ✨ Features

### 🎯 Core Functionality
- **Real-time Drawing**: Collaborative whiteboard with multiple drawing tools
- **Live Presence**: See who's online and actively participating
- **Session Management**: Create, join, and manage drawing sessions
- **User Authentication**: Secure login and registration system

### 🛠️ Drawing Tools
- ✏️ **Pen Tool**: Smooth drawing with customizable thickness and color
- 📏 **Line Tool**: Straight lines and shapes
- ⬜ **Rectangle Tool**: Draw rectangles and squares
- ⭕ **Circle Tool**: Perfect circles and ellipses
- ➡️ **Arrow Tool**: Directional arrows for annotations
- 📝 **Text Tool**: Add text annotations
- 🧽 **Eraser Tool**: Remove unwanted strokes
- 👆 **Select Tool**: Move and manipulate drawings

### 👥 Collaboration Features
- **Real-time Sync**: All drawings appear instantly across all connected users
- **Presence Indicators**: See who's online and what tool they're using
- **Session Ownership**: Session creators control drawing permissions
- **Collaborative Drawing**: Toggle collaborative mode to let others draw

### 🔐 Security & Authentication
- JWT-based authentication
- Session-based access control
- Secure WebSocket connections
- CORS protection

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for modern UI
- **State Management**: React hooks and context
- **Real-time Communication**: WebSocket connections
- **Build Tool**: Vite for fast development

### Backend (Spring Boot + Java)
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL with Flyway migrations
- **Authentication**: JWT tokens with Spring Security
- **Real-time**: WebSocket with STOMP protocol
- **API**: RESTful endpoints with proper validation

### Infrastructure
- **Deployment**: Railway (backend) + Vercel (frontend)
- **Database**: PostgreSQL hosted on Railway
- **WebSocket**: Spring WebSocket support
- **CORS**: Configured for cross-origin requests

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- PostgreSQL (for local development)
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/senthil-prabhu-sudo/realtime-collaboration-whiteboard.git
   cd realtime-collaboration-whiteboard
   ```

2. **Set up the database**
   ```sql
   CREATE DATABASE whiteboard_db;
   ```

3. **Configure environment variables**
   Create `backend/src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/whiteboard_db
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   jwt.secret=your_jwt_secret_key
   ```

4. **Run the backend**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API endpoint**
   Update `frontend/src/lib/api.ts` with your backend URL:
   ```typescript
   const API_URL = 'http://localhost:8080'; // or your production URL
   ```

3. **Run the frontend**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open [http://localhost:5173](http://localhost:5173) in your browser

## 📁 Project Structure

```
realtime-collaboration-whiteboard/
├── backend/                          # Spring Boot backend
│   ├── src/main/java/com/whiteboard/backend/
│   │   ├── auth/                     # Authentication & JWT
│   │   ├── chat/                     # Chat functionality
│   │   ├── config/                   # Security & WebSocket config
│   │   ├── presence/                 # User presence tracking
│   │   ├── session/                  # Session management
│   │   ├── stroke/                   # Drawing stroke handling
│   │   ├── user/                     # User management
│   │   └── BackendApplication.java   # Main application class
│   ├── src/main/resources/
│   │   ├── application.properties    # Configuration
│   │   └── db/migration/             # Database migrations
│   └── pom.xml                       # Maven configuration
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   ├── contexts/                 # React context providers
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # API and utility functions
│   │   └── utils/                    # Helper utilities
│   ├── package.json                  # Node dependencies
│   └── vite.config.ts                # Vite configuration
├── railway.toml                      # Railway deployment config
└── README.md                         # This file
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Session Endpoints
- `GET /sessions` - List all public sessions
- `GET /sessions/{id}` - Get session details
- `POST /sessions` - Create new session
- `DELETE /sessions/{id}` - Delete session (owner only)
- `POST /sessions/{id}/toggle-collaborative-drawing` - Toggle drawing permissions

### Presence Endpoints
- `GET /presence/{sessionId}` - Get online users
- `POST /presence/upsert` - Update user presence
- `DELETE /presence/{sessionId}` - Remove user presence

### Drawing Endpoints
- `GET /strokes/session/{sessionId}` - Get session strokes
- `POST /strokes` - Create new stroke
- `PUT /strokes/{id}` - Update stroke
- `DELETE /strokes/{id}` - Delete stroke
- `POST /strokes/undo/{sessionId}` - Undo last stroke
- `DELETE /strokes/session/{sessionId}` - Clear all strokes

## 🌐 WebSocket Events

### Drawing Events
- `/topic/strokes/{sessionId}` - Real-time stroke updates
- `/app/stroke` - Send stroke updates

### Presence Events
- `/topic/presence/{sessionId}` - User presence updates

### Session Events
- `/topic/sessions/{sessionId}` - Session updates (collaborative drawing toggle, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write clear, descriptive commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Spring Boot, and PostgreSQL
- Real-time features powered by WebSocket and STOMP
- UI components styled with Tailwind CSS
- Deployed on Railway and Vercel

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the maintainers.

---

**Happy Drawing! 🎨✨**