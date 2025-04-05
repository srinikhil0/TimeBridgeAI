import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: ChatMessage[];
  userId: string;
}

class ChatService {
  private readonly CHATS_COLLECTION = 'chats';

  private convertTimestamps<T>(data: unknown): T {
    if (data instanceof Timestamp) {
      return data.toDate() as T;
    } else if (Array.isArray(data)) {
      return data.map(item => this.convertTimestamps<unknown>(item)) as T;
    } else if (data && typeof data === 'object') {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        converted[key] = this.convertTimestamps<unknown>(value);
      }
      return converted as T;
    }
    return data as T;
  }

  async createChat(userId: string, firstMessage: string, aiResponse: string): Promise<string> {
    try {
      const timestamp = serverTimestamp();
      const messageTimestamp = new Date();
      const chatData = {
        title: this.generateTitle(firstMessage),
        preview: firstMessage,
        timestamp,
        messages: [
          {
            id: Date.now().toString(),
            content: firstMessage,
            role: 'user',
            timestamp: messageTimestamp
          },
          {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            role: 'assistant',
            timestamp: messageTimestamp
          }
        ],
        userId
      };

      const docRef = await addDoc(collection(db, this.CHATS_COLLECTION), chatData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat. Please ensure you are logged in.');
    }
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const q = query(
        collection(db, this.CHATS_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = this.convertTimestamps<Omit<ChatSession, 'id'>>(doc.data());
        return {
          id: doc.id,
          ...data
        } as ChatSession;
      });
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      throw new Error('Failed to load chats. Please ensure you are logged in.');
    }
  }

  async addMessageToChat(chatId: string, message: Omit<ChatMessage, 'id'>): Promise<void> {
    try {
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        throw new Error('Chat not found');
      }

      const newMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date()
      };

      const currentData = chatDoc.data();
      const messages = currentData.messages || [];

      await updateDoc(chatRef, {
        messages: [...messages, newMessage],
        preview: message.role === 'user' ? message.content : currentData.preview,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error('Failed to send message. Please try again.');
    }
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const chatRef = doc(db, this.CHATS_COLLECTION, chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        throw new Error('Chat not found');
      }

      const data = chatDoc.data();
      return this.convertTimestamps<ChatMessage[]>(data.messages || []);
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error('Failed to load messages. Please try again.');
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.CHATS_COLLECTION, chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat. Please try again.');
    }
  }

  private generateTitle(message: string): string {
    const words = message.split(' ').slice(0, 5);
    return words.join(' ') + (words.length < message.split(' ').length ? '...' : '');
  }
}

export const chatService = new ChatService(); 