import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Avatar, Divider, CircularProgress, IconButton, Menu, MenuItem, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EventIcon from '@mui/icons-material/Event';
import MenuIcon from '@mui/icons-material/Menu';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { aiService } from '../services/aiService';
import { auth } from '../config/firebase';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { chatService, type ChatMessage, type ChatSession } from '../services/chatService';

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        gap: 1,
      }}
    >
      {!isUser && (
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <SmartToyIcon />
        </Avatar>
      )}
      
      <Paper
        elevation={1}
        sx={{
          maxWidth: '70%',
          p: 2,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderRadius: 2,
          '& pre': { margin: 0 },
          '& code': {
            fontFamily: 'monospace',
            fontSize: '0.9em',
          },
        }}
      >
        <ReactMarkdown
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <SyntaxHighlighter style={atomDark} language={match[1]}>
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className}>{children}</code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </Paper>

      {isUser && (
        <Avatar sx={{ bgcolor: 'secondary.main' }}>
          <PersonIcon />
        </Avatar>
      )}
    </Box>
  );
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  // Load chat sessions when component mounts
  useEffect(() => {
    const loadChatSessions = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const sessions = await chatService.getChatSessions(user.uid);
          setChatSessions(sessions);
        } catch (error) {
          console.error('Error loading chat sessions:', error);
        }
      }
    };

    loadChatSessions();
  }, []);

  // Load messages when chat is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (currentChatId) {
        try {
          const messages = await chatService.getChatMessages(currentChatId);
          setMessages(messages);
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      }
    };

    loadMessages();
  }, [currentChatId]);

  const handleNewChat = async () => {
    setMessages([]);
    setInputMessage('');
    setCurrentChatId(null);
  };

  const handleChatSelect = async (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCalendarClick = () => {
    const user = auth.currentUser;
    if (user?.email) {
      window.open(`https://calendar.google.com/calendar/embed?authuser=${encodeURIComponent(user.email)}`, '_blank');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!inputMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    try {
      setIsLoading(true);
      
      // Get AI response before creating chat or adding message
      const context = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
      const response = await aiService.sendMessage(inputMessage, context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };

      // Create new chat if none exists
      if (!currentChatId) {
        // Create chat with both messages
        const newChatId = await chatService.createChat(user.uid, inputMessage, response);
        setCurrentChatId(newChatId);
        
        // Refresh chat sessions
        const sessions = await chatService.getChatSessions(user.uid);
        setChatSessions(sessions);
      } else {
        // Add both messages to existing chat
        await chatService.addMessageToChat(currentChatId, userMessage);
        await chatService.addMessageToChat(currentChatId, assistantMessage);
      }

      // Update UI with both messages
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: isSidebarOpen ? 280 : 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          overflow: 'hidden',
          transition: 'width 0.2s',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Logo Section */}
        <Box 
          sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img 
            src="/public/Timebridge_white.png" 
            alt="TimeBridge AI" 
            style={{ height: 40, width: 'auto' }}
          />
        </Box>

        {/* New Chat Button */}
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{
              borderRadius: 2,
              py: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            New Chat
          </Button>
        </Box>

        {/* Chat History */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'background.paper',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'action.hover',
              borderRadius: '4px',
            },
          }}
        >
          {chatSessions.map((session) => (
            <Box
              key={session.id}
              sx={{
                p: 2,
                cursor: 'pointer',
                '&:hover': { 
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  mx: 1,
                },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                mb: 1,
              }}
              onClick={() => handleChatSelect(session.id)}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.preview}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.disabled"
                sx={{ fontSize: '0.7rem' }}
              >
                {new Date(session.timestamp).toLocaleDateString()}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Settings Button */}
        <Box 
          sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => {/* Add settings handler */}}
        >
          <SettingsIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            Settings
          </Typography>
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6">TimeBridge AI</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleCalendarClick}>
              <EventIcon />
            </IconButton>
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Messages Area */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            overflow: 'auto',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <SmartToyIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="h5" color="text.secondary">
                Start a conversation with TimeBridge AI
              </Typography>
              <Typography color="text.secondary">
                I can help you manage your calendar and schedule meetings
              </Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>

        <Divider />

        {/* Chat Input */}
        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </Box>
    </Box>
  );
};

export default Chat;