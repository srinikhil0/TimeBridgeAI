export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
export const API_ROUTES = {
    preferences: '/api/user/preferences',  // Match the backend route
    auth: '/api/auth/verify',
    chat: '/api/chat/message',
    calendar: '/api/calendar'
}; 