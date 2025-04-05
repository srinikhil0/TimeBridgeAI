import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './styles/theme';
import Login from './pages/Login';
import Chat from './pages/Chat';
import { CalendarProvider } from './contexts/CalendarContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CalendarProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/" element={<Navigate to="/chat" replace />} />
            </Routes>
          </Router>
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
