import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Close the popup window if this is running in a popup
    if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_CALLBACK', url: window.location.href }, window.location.origin);
      window.close();
    } else {
      // If not in a popup, redirect to the main app
      navigate('/chat');
    }
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      Completing authentication...
    </div>
  );
};

export default AuthCallback; 