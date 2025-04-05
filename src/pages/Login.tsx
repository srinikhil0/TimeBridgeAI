import { useState } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  styled,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '@mui/icons-material/Google';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import UpdateIcon from '@mui/icons-material/Update';

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    '&:hover fieldset': {
      borderColor: '#667eea',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#667eea',
    },
  },
});

const AuthButton = styled(Button)({
  borderRadius: '8px',
  padding: '12px',
  textTransform: 'none',
  fontSize: '16px',
  fontWeight: 500,
});

const FeatureCard = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '24px',
  padding: '20px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateX(10px)',
  },
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add calendar-related scopes
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      // Store the access token for later use
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('calendar_token', JSON.stringify({
          access_token: credential.accessToken,
          timestamp: Date.now()
        }));
      }
      
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      overflow: 'hidden'
    }}>
      {/* Left Side - Login Form */}
      <Box 
        sx={{ 
          flex: { xs: '1 1 100%', md: '1 1 50%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 4, md: 8 },
          backgroundColor: '#ffffff',
          minHeight: '100vh'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '400px' }}>
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '2rem', md: '2.5rem' } }}>
              TimeBridgeAI
            </Typography>
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}

          <form onSubmit={handleEmailAuth}>
            <StyledTextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <StyledTextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <AuthButton
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mb: 2,
                backgroundColor: '#667eea',
                '&:hover': { backgroundColor: '#5a6fd1' }
              }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </AuthButton>
          </form>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            my: 3
          }}>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
            <Typography sx={{ px: 2, color: '#666' }}>OR</Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
          </Box>

          <AuthButton
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            sx={{ 
              mb: 3,
              borderColor: '#e0e0e0',
              color: '#666',
              '&:hover': { borderColor: '#667eea', backgroundColor: '#f8f9ff' }
            }}
          >
            Continue with Google
          </AuthButton>

          <Typography align="center" sx={{ color: '#666' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Button
              onClick={() => setIsSignUp(!isSignUp)}
              sx={{ 
                textTransform: 'none',
                color: '#667eea',
                '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Features */}
      {!isMobile && (
        <Box 
          sx={{ 
            flex: '1 1 50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            p: { xs: 4, md: 8 },
            color: 'white',
            minHeight: '100vh',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.1)',
              zIndex: 1
            }
          }}
        >
          <Box sx={{ 
            maxWidth: '500px', 
            mx: 'auto',
            position: 'relative',
            zIndex: 2
          }}>
            <Typography variant="h3" sx={{ mb: 4, fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Your Smart Calendar Assistant
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 8, opacity: 0.9, fontWeight: 400, lineHeight: 1.6 }}>
              Experience the future of calendar management with AI-powered scheduling, 
              smart reminders, and seamless integration with your existing calendars.
            </Typography>

            <Box>
              <FeatureCard>
                <CalendarMonthIcon sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Natural Language Scheduling
                  </Typography>
                  <Typography sx={{ opacity: 0.9 }}>
                    Schedule meetings and events using natural language commands, just like talking to a human assistant.
                  </Typography>
                </Box>
              </FeatureCard>

              <FeatureCard>
                <NotificationsActiveIcon sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Smart Reminders
                  </Typography>
                  <Typography sx={{ opacity: 0.9 }}>
                    Get intelligent reminders that adapt to your schedule and preferences.
                  </Typography>
                </Box>
              </FeatureCard>

              <FeatureCard>
                <UpdateIcon sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Google Calendar Sync
                  </Typography>
                  <Typography sx={{ opacity: 0.9 }}>
                    Seamlessly integrate with your existing Google Calendar for a unified experience.
                  </Typography>
                </Box>
              </FeatureCard>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Login;