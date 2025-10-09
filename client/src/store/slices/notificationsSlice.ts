import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationItem {
  _id: string;
  type: 'like' | 'comment' | 'reply' | 'message';
  createdAt: string;
  data?: any;
  read?: boolean;
}

interface NotificationsState {
  items: NotificationItem[];
  unread: number;
}

const initialState: NotificationsState = {
  items: [],
  unread: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.items = action.payload;
      state.unread = action.payload.filter(n => !n.read).length;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      state.items = [action.payload, ...state.items];
      state.unread += 1;
    },
    markAllRead(state) {
      state.items = state.items.map(n => ({ ...n, read: true }));
      state.unread = 0;
    }
  }
});

export const { setNotifications, addNotification, markAllRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
