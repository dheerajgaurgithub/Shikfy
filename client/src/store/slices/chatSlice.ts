import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  attachments?: any[];
  createdAt: string;
}

export interface Chat {
  _id: string;
  type: 'dm' | 'group';
  members: any[];
  name?: string;
  lastMessageAt?: string;
}

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>; // by chatId
  activeChatId: string | null;
}

const initialState: ChatState = {
  chats: [],
  messages: {},
  activeChatId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats(state, action: PayloadAction<Chat[]>) {
      state.chats = action.payload;
    },
    setActiveChat(state, action: PayloadAction<string | null>) {
      state.activeChatId = action.payload;
    },
    setMessages(state, action: PayloadAction<{ chatId: string; items: Message[] }>) {
      state.messages[action.payload.chatId] = action.payload.items;
    },
    prependMessage(state, action: PayloadAction<Message>) {
      const m = action.payload;
      state.messages[m.chatId] = [m, ...(state.messages[m.chatId] || [])];
    }
  }
});

export const { setChats, setActiveChat, setMessages, prependMessage } = chatSlice.actions;
export default chatSlice.reducer;
