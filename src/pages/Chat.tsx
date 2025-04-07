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
import EventCreationDialog from '../components/EventCreationDialog';

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        gap: 1,
      }}
    >
      {!isUser && (
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <SmartToyIcon />
        </Avatar>
      )}
      
      <Box
        sx={{
          maxWidth: '70%',
          px: 1,
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
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </Box>

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
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(null);
  const [chatMenuAnchorEl, setChatMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
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

  const handleCalendarClick = (event: React.MouseEvent<HTMLElement>) => {
    setCalendarAnchorEl(event.currentTarget);
  };

  const handleCalendarMenuClose = () => {
    setCalendarAnchorEl(null);
  };

  const handleOpenCalendar = () => {
    const user = auth.currentUser;
    if (user?.email) {
      window.open(`https://calendar.google.com/calendar/embed?authuser=${encodeURIComponent(user.email)}`, '_blank');
    }
    handleCalendarMenuClose();
  };

  const handleCreateEvent = () => {
    setIsEventDialogOpen(true);
    handleCalendarMenuClose();
  };

  const handleEventCreated = () => {
    console.log('Event created successfully');
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

  const handleChatMenuOpen = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
    event.stopPropagation();
    setChatMenuAnchorEl(event.currentTarget);
    setSelectedChatId(chatId);
  };

  const handleChatMenuClose = () => {
    setChatMenuAnchorEl(null);
    setSelectedChatId(null);
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    
    try {
      await chatService.deleteChat(selectedChatId);
      setChatSessions(prev => prev.filter(chat => chat.id !== selectedChatId));
      if (currentChatId === selectedChatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      handleChatMenuClose();
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: isSidebarOpen ? { xs: '100%', sm: 280 } : 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          overflow: 'hidden',
          transition: 'width 0.2s',
          display: 'flex',
          flexDirection: 'column',
          position: { xs: 'fixed', sm: 'relative' },
          height: '100vh',
          zIndex: 1200,
        }}
      >
        {/* Logo Section */}
        <Box 
          sx={{ 
            p: { xs: 1, sm: 2 }, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img 
              src="/Timebridge_white.png" 
              alt="TimeBridge AI" 
              style={{ height: 32, width: 'auto' }}
            />
          </Box>
          <IconButton 
            sx={{ display: { xs: 'block', sm: 'none' } }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* New Chat Button */}
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{
              borderRadius: 2,
              py: 0.75,
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
            px: { xs: 1, sm: 2 },
            py: 1,
            '&::-webkit-scrollbar': {
              width: '4px',
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
          {chatSessions.map((chat) => (
            <Paper
              key={chat.id}
              elevation={1}
              sx={{
                py: 0.75,
                px: 1.5,
                mb: 0.5,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: currentChatId === chat.id ? 'action.selected' : 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => handleChatSelect(chat.id)}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {chat.title}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleChatMenuOpen(e, chat.id)}
                sx={{ ml: 0.5 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>

        {/* Chat Menu */}
        <Menu
          anchorEl={chatMenuAnchorEl}
          open={Boolean(chatMenuAnchorEl)}
          onClose={handleChatMenuClose}
        >
          <MenuItem onClick={handleDeleteChat}>Delete</MenuItem>
        </Menu>

        {/* Settings Button */}
        <Box 
          sx={{ 
            p: { xs: 1, sm: 2 }, 
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
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: isSidebarOpen ? { xs: 0, sm: 'auto' } : 'auto',
      }}>
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.25rem' },
                display: { xs: isSidebarOpen ? 'none' : 'block', sm: 'block' }
              }}
            >
              TimeBridge AI
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={handleCalendarClick}>
              <EventIcon />
            </IconButton>
            <Menu
              anchorEl={calendarAnchorEl}
              open={Boolean(calendarAnchorEl)}
              onClose={handleCalendarMenuClose}
            >
              <MenuItem onClick={handleOpenCalendar}>Open Calendar</MenuItem>
              <MenuItem onClick={handleCreateEvent}>Create Event</MenuItem>
            </Menu>
            <IconButton size="small" onClick={handleMenuOpen}>
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

      <EventCreationDialog
        open={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </Box>
  );
};

export default Chat;