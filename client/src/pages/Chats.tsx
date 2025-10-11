import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { io as socketIO, Socket } from 'socket.io-client';

interface Chat {
  _id: string;
  type: 'dm' | 'group';
  members: Array<{ _id: string; username: string; displayName: string; profilePic?: string }>;
  name?: string;
}

interface Message {
  _id: string;
  chatId: string;
  senderId: { _id: string; username: string; displayName: string; profilePic?: string };
  content: string;
  createdAt: string;
  readBy?: Array<string | { _id: string }>;
  status?: 'sent'|'delivered'|'read';
}

const Chats: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const query = useMemo(()=> new URLSearchParams(location.search), [location.search]);
  const targetChatId = query.get('chatId');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [blockedByYou, setBlockedByYou] = useState<boolean>(false);
  const [blockedYou, setBlockedYou] = useState<boolean>(false);
  const [disappearing24h, setDisappearing24h] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);
  const [typingOther, setTypingOther] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string; url: string; type: 'image'|'video'|'file' }>>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showReactForId, setShowReactForId] = useState<string | null>(null);
  const [folder, setFolder] = useState<'primary'|'general'|'requests'|''>('primary');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderCounts, setFolderCounts] = useState<{ primary: number; general: number; requests: number }>({ primary: 0, general: 0, requests: 0 });
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const longPressTimerRef = useRef<any>(null);
  const emojis: string[] = ['😀','😄','😁','😂','🤣','😊','😍','😘','😎','🤩','😇','🤗','🤝','👏','👍','🔥','💯','❤️','🧡','💙','💜','🤍','💔','🥰','😢','😭','😤','😡','😴','🤤'];
  const stickerPacks: { name: string; urls: string[] }[] = [
    { name: 'Love', urls: [
      'https://i.imgur.com/CIQ0c0P.png',
      'https://i.imgur.com/3d6mHh2.png',
      'https://i.imgur.com/5gq6s6v.png'
    ]},
    { name: 'Funny', urls: [
      'https://i.imgur.com/2u7W1jT.png',
      'https://i.imgur.com/0C6zq1V.png',
      'https://i.imgur.com/3q0w4pU.png'
    ]},
    { name: 'Feelings', urls: [
      'https://i.imgur.com/9bR7yQk.png',
      'https://i.imgur.com/jlq3e8k.png',
      'https://i.imgur.com/2wGx1pP.png'
    ]}
  ];

  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await apiClient.get(`/chats${folder ? ('?folder='+folder) : ''}`);
        const list: Chat[] = res.data || [];
        setChats(list);
        try { const fc = await apiClient.get('/chats/folder-counts'); setFolderCounts(fc.data||{primary:0,general:0,requests:0}); } catch {}
        try {
          const seed: Record<string, string> = {};
          list.forEach(c => c.members.forEach((m:any) => {
            if (m._id !== user?.id && m.lastSeen) seed[m._id] = m.lastSeen;
          }));
          setLastSeenMap(prev => ({ ...prev, ...seed }));
        } catch {}
        if (targetChatId) {
          const found = list.find(c => c._id === targetChatId);
          if (found) {
            await selectChat(found);
          }
        }

        try {
          const entries = await Promise.all(list.map(async (c)=>{
            try {
              const ms = await apiClient.get(`/messages/${c._id}?limit=50`);
              const count = (ms.data||[]).filter((m:any)=> !Array.isArray(m.readBy) || !m.readBy.some((r:any)=> (typeof r==='string'? r : r._id)===user?.id)).length;
              return [c._id, count] as const;
            } catch { return [c._id, 0] as const; }
          }));
          setUnreadMap(Object.fromEntries(entries));
        } catch {}

        try {
          if (!socketRef.current) {
            const s = socketIO(import.meta.env.VITE_API_BASE?.replace('/api','') || 'http://localhost:3001', { withCredentials: true });
            socketRef.current = s;
            s.on('connect', ()=>{
              list.forEach(c=> s.emit('chat:join', c._id));
            });
            s.on('message:new', (data:any)=>{
              setUnreadMap(prev=>{
                if (!activeChat || data.chatId !== activeChat._id) {
                  const next = { ...prev };
                  next[data.chatId] = (next[data.chatId]||0) + 1;
                  return next;
                }
                return prev;
              });
              if (activeChat && data.chatId === activeChat._id) {
                const normalized = {
                  _id: data._id,
                  chatId: data.chatId,
                  senderId: typeof data.senderId === 'string' ? { _id: data.senderId, username: '', displayName: '' } : data.senderId,
                  content: data.content || '',
                  createdAt: data.createdAt || new Date().toISOString(),
                  readBy: data.readBy || [],
                  status: data.status || 'sent'
                } as any;
                setMessages(prev=> [normalized, ...prev]);
              }
            });

            s.on('user:typing', (data:any)=>{
              if (!activeChat) return;
              const otherId = activeChat.members.find(m=> m._id !== user?.id)?._id;
              if (data?.chatId === activeChat._id && otherId && data.userId === otherId) {
                setTypingOther(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(()=> setTypingOther(false), 2500);
              }
            });

            s.on('user:status', (p:{ userId: string; online: boolean; lastSeen?: string })=>{
              setOnlineMap(prev=> ({ ...prev, [p.userId]: p.online }));
              if (p.lastSeen) setLastSeenMap(prev=> ({ ...prev, [p.userId]: p.lastSeen! }));
            });

            s.on('message:updated', (u:{ _id:string; content:string; editedAt:string })=>{
              setMessages(prev => prev.map(m => (m as any)._id===u._id ? { ...m, content: u.content, editedAt: u.editedAt } as any : m));
            });
            s.on('message:deleted', (d:{ _id:string })=>{
              setMessages(prev => prev.filter(m => (m as any)._id!==d._id));
            });
            s.on('message:reactions', (p:{ _id:string; reactions:any[] })=>{
              setMessages(prev => prev.map(m => (m as any)._id===p._id ? ({ ...m, reactions: p.reactions } as any) : m));
            });
          } else {
            const s = socketRef.current;
            list.forEach(c=> s!.emit('chat:join', c._id));
          }
        } catch {}
      } catch (e) {
        console.error('Failed to load chats', e);
      } finally {
        setLoadingChats(false);
      }
    };

    loadChats();
  }, [targetChatId, folder]);

  useEffect(() => {
    return () => {
      try { socketRef.current?.disconnect(); } catch {}
    };
  }, []);

  useEffect(() => {
    const onDocClick = () => { setOpenMenuId(null); setShowReactForId(null); };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const startReply = (m: any) => { setReplyToId((m as any)._id); };
  const cancelReply = () => setReplyToId(null);
  const reactEmojis: string[] = ['👍','❤️','😂','😮','😢','🙏'];
  const toggleReaction = async (msg: any, emoji: string) => {
    try {
      const mineReacted = Array.isArray((msg as any).reactions) && (msg as any).reactions.some((r: any) => r.emoji === emoji && (String(r.userId?._id || r.userId) === String(user?.id)));
      if (mineReacted) {
        await apiClient.delete(`/messages/${(msg as any)._id}/reactions`, { data: { emoji } as any });
      } else {
        await apiClient.post(`/messages/${(msg as any)._id}/reactions`, { emoji });
      }
    } catch {}
  };

  const selectChat = async (chat: Chat) => {
    setActiveChat(chat);
    setShowMobileSidebar(false);
    setLoadingMsgs(true);
    try {
      const res = await apiClient.get(`/messages/${chat._id}`);
      setMessages(res.data || []);
      try {
        await apiClient.patch(`/messages/${chat._id}/read`);
        setUnreadMap(prev=>({...prev, [chat._id]: 0}));
        try {
          const uc = await apiClient.get('/chats/unread-count');
          const count = Number(uc.data?.count||0);
          window.dispatchEvent(new CustomEvent('chats:unread', { detail: { count } }));
        } catch {}
      } catch {}
      try {
        const ch = await apiClient.get(`/chats/${chat._id}`);
        const s = (ch.data?.settings)||{};
        setDisappearing24h(!!s.disappearing24h);
        try {
          const myInbox = (ch.data?.inboxes||[]).find((e:any)=> String(e.userId)===String(user?.id));
          setBlockedByYou(false);
          setBlockedYou(false);
          (window as any)._chat_myInbox = myInbox || null;
        } catch {}
      } catch {}
      try {
        const other = chat.members.find(m=> m._id !== user?.id);
        if (other) {
          const bs = await apiClient.get(`/users/${other._id}/block-status`);
          setBlockedByYou(!!bs.data?.blockedByYou);
          setBlockedYou(!!bs.data?.blockedYou);
        }
      } catch {}
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || (!text.trim() && pendingFiles.length===0)) return;
    try {
      const res = await apiClient.post(`/messages`, { chatId: activeChat._id, content: text, attachments: pendingFiles.map(f=> ({ type: f.type, url: f.url, name: f.name })), replyToMessageId: replyToId || undefined });
      setMessages(prev => [res.data, ...prev]);
      setText('');
      setPendingFiles([]);
      setReplyToId(null);
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const startEdit = (m:any) => { setEditingId(m._id); setEditText(m.content || ''); };
  const saveEdit = async () => {
    if (!editingId) return;
    try { await apiClient.patch(`/messages/${editingId}`, { content: editText }); setEditingId(null); setEditText(''); }
    catch (e:any) { alert(e?.response?.data?.error || 'Failed to edit'); }
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const toggleSelectMode = () => { setSelectMode(v=>!v); setSelectedIds({}); };
  const toggleSelect = (id:string) => setSelectedIds(prev=> ({ ...prev, [id]: !prev[id] }));
  const bulkDelete = async (mode:'for_me'|'for_everyone') => {
    try {
      const ids = Object.keys(selectedIds).filter(k=> selectedIds[k]);
      if (!ids.length) return;
      await apiClient.delete('/messages/bulk', { data: { ids, mode } as any });
      if (mode==='for_everyone') setMessages(prev=> prev.filter(m=> !ids.includes((m as any)._id)));
      setSelectedIds({}); setSelectMode(false);
    } catch (e:any) {
      alert(e?.response?.data?.error || 'Failed to delete');
    }
  };

  const pickFile = () => fileInputRef.current?.click();
  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await apiClient.post('/uploads/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const data = r.data || {};
    const t: 'image'|'video'|'file' = data.resource_type === 'image' ? 'image' : (data.resource_type === 'video' ? 'video' : 'file');
    return { name: file.name, url: data.url, type: t } as { name: string; url: string; type: 'image'|'video'|'file' };
  };
  const onFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploaded: Array<{ name: string; url: string; type: 'image'|'video'|'file' }> = [];
      for (const f of Array.from(files)) {
        try { const u = await uploadFile(f); uploaded.push(u); } catch {}
      }
      setPendingFiles(prev=> [...prev, ...uploaded]);
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value=''; }
  };

  const chatTitle = (chat: Chat) => {
    if (chat.type === 'group' && chat.name) return chat.name;
    const other = chat.members.find(m => m._id !== user?.id);
    return other ? other.displayName : 'Direct Message';
  };

  const chatAvatar = (chat: Chat) => {
    const other = chat.members.find(m => m._id !== user?.id);
    return other?.profilePic;
  };

  const absoluteTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const relativeTime = (iso?: string) => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 2) return 'Seen now';
    if (minutes < 60) return `Seen ${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Seen ${hours} hour${hours>1?'s':''} ago`;
    const days = Math.floor(hours / 24);
    return `Seen ${days} day${days>1?'s':''} ago`;
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Mobile Back Button */}
      {!showMobileSidebar && activeChat && (
        <button
          onClick={() => { setShowMobileSidebar(true); setActiveChat(null); }}
          className="md:hidden fixed top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200"
        >
          ←
        </button>
      )}

      {/* Sidebar */}
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/50 shadow-xl`}>
        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Messages</h1>
            <button 
              onClick={() => setShowNewChat(true)} 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xl sm:text-2xl shadow-lg transition-all hover:scale-110"
            >
              +
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setFolder('' as any)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium transition-all ${folder === '' ? 'bg-white text-purple-600 shadow-lg scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              All
            </button>
            <button onClick={() => setFolder('primary')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium transition-all ${folder === 'primary' ? 'bg-white text-purple-600 shadow-lg scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              Primary {folderCounts.primary > 0 && <span className="ml-1 px-1.5 sm:px-2 rounded-full bg-purple-500 text-white text-xs">{folderCounts.primary}</span>}
            </button>
            <button onClick={() => setFolder('general')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium transition-all ${folder === 'general' ? 'bg-white text-purple-600 shadow-lg scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              General {folderCounts.general > 0 && <span className="ml-1 px-1.5 sm:px-2 rounded-full bg-pink-500 text-white text-xs">{folderCounts.general}</span>}
            </button>
            <button onClick={() => setFolder('requests')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium transition-all ${folder === 'requests' ? 'bg-white text-purple-600 shadow-lg scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              Requests {folderCounts.requests > 0 && <span className="ml-1 px-1.5 sm:px-2 rounded-full bg-yellow-500 text-white text-xs">{folderCounts.requests}</span>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-8 text-center">
              <div className="inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No conversations yet</p>
              <button onClick={() => setShowNewChat(true)} className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Start chatting
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {chats.map((c) => {
                const other = c.members.find(m => m._id !== user?.id);
                const online = other ? onlineMap[other._id] : false;
                const myInbox = ((c as any).inboxes || []).find((e: any) => String(e.userId) === String(user?.id));
                return (
                  <button
                    key={c._id}
                    onClick={() => selectChat(c)}
                    className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left transition-all hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 ${activeChat?._id === c._id ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl overflow-hidden shadow-lg ring-2 ring-white dark:ring-gray-800">
                        {chatAvatar(c) ? (
                          <img src={chatAvatar(c)} className="w-full h-full object-cover" alt={chatTitle(c)} />
                        ) : (
                          <span>{chatTitle(c)[0]}</span>
                        )}
                      </div>
                      {online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 shadow-lg animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {chatTitle(c)}
                          {myInbox && myInbox.folder === 'requests' && myInbox.accepted === false && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 font-medium shadow-sm">Request</span>
                          )}
                        </span>
                        {!!unreadMap[c._id] && (
                          <span className="flex-shrink-0 min-w-[1.5rem] h-6 px-2 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg">
                            {unreadMap[c._id]}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs sm:text-sm font-medium ${online ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {online ? '✨ Active now' : relativeTime(other && (lastSeenMap[other._id] || (other as any)?.lastSeen))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showMobileSidebar || !activeChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce">💌</div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-4 text-center">Select a conversation</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center">Choose from your existing chats or start a new one</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <div className="p-3 sm:p-4 flex items-center justify-between">
                <button onClick={() => setShowInfo(true)} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg ring-2 ring-white dark:ring-gray-800 flex-shrink-0">
                    {(() => { const a = chatAvatar(activeChat); return a ? <img src={a} className="w-full h-full object-cover" alt={chatTitle(activeChat)} /> : <span>{chatTitle(activeChat)[0]}</span>; })()}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                      {chatTitle(activeChat)}
                    </div>
                    {activeChat.type === 'dm' && (() => {
                      const other = activeChat.members.find(m => m._id !== user?.id);
                      const otherId = other?._id;
                      const online = otherId ? onlineMap[otherId] : false;
                      const lastSeen = otherId ? (lastSeenMap[otherId] || (other as any)?.lastSeen) : undefined;
                      return (
                        <div className={`text-xs sm:text-sm font-medium ${online ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {typingOther ? (
                            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <span>typing</span>
                              <span className="inline-flex gap-0.5">
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                              </span>
                            </div>
                          ) : online ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Active now
                            </span>
                          ) : (
                            <span>{relativeTime(lastSeen)}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {disappearing24h && (
                    <span className="hidden sm:inline-flex text-xs px-2 sm:px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                      🕐 24h
                    </span>
                  )}
                  <div className="relative">
                    <button onClick={() => setShowMoveMenu(v => !v)} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      Move
                    </button>
                    {showMoveMenu && (
                      <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[150px]">
                        <button onClick={async () => { try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { folder: 'primary', accepted: true }); setShowMoveMenu(false); if (folder !== 'primary') setFolder('primary'); else await selectChat(activeChat!); } catch {} }} className="block w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium transition-colors">
                          📌 Primary
                        </button>
                        <button onClick={async () => { try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { folder: 'general', accepted: true }); setShowMoveMenu(false); if (folder !== 'general') setFolder('general'); else await selectChat(activeChat!); } catch {} }} className="block w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium transition-colors">
                          💬 General
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Banner */}
              {(() => {
                const myInbox = (window as any)._chat_myInbox;
                if (myInbox && myInbox.accepted === false) {
                  return (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 p-3 sm:p-4 shadow-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xl sm:text-2xl">⚠️</span>
                            <div>
                              <p className="text-sm sm:text-base font-semibold text-yellow-900 dark:text-yellow-100">Message Request</p>
                              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">Accept to move this chat to Primary</p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={async () => { try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { accepted: true, folder: 'primary' }); setFolder('primary'); await selectChat(activeChat!); } catch {} }} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm">
                              ✓ Accept
                            </button>
                            <button onClick={async () => { try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { accepted: false, folder: 'requests' }); await selectChat(activeChat!); } catch {} }} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium shadow-md hover:shadow-lg transition-all text-sm">
                              Keep
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 flex flex-col-reverse gap-2 sm:gap-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmOWQ1ZTUiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydjItMnptLTItMnYyLTJ6bS0yLTJ2Mi0yem0tMi0ydjItMnptLTItMnYyLTJ6bS0yLTJ2Mi0yem0tMi0ydjItMnoiLz48L2c+PC9nPjwvc3ZnPg==')] dark:bg-none">
              {loadingMsgs ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = typeof (m as any).senderId === 'string' ? (m as any).senderId : (m as any).senderId?._id;
                  const mine = senderId === user?.id;
                  const otherId = activeChat?.members.find(mm => mm._id !== user?.id)?._id;
                  const isLastMine = mine && idx === 0;
                  const read = Array.isArray((m as any).readBy) && otherId ? ((m as any).readBy as any[]).some((r: any) => (typeof r === 'string' ? r : r._id) === otherId) : (m as any).status === 'read';
                  const beginLong = () => {
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(() => setShowReactForId((m as any)._id), 500);
                  };
                  const cancelLong = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } };
                  
                  return (
                    <div
                      key={m._id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                      onMouseLeave={() => { if (openMenuId === (m as any)._id) setOpenMenuId(null); cancelLong(); }}
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={beginLong}
                      onTouchEnd={cancelLong}
                      onMouseDown={beginLong}
                      onMouseUp={cancelLong}
                    >
                      <div className={`relative group max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl transition-all ${mine ? 'bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'}`}>
                        {selectMode && (
                          <label className={`flex items-center gap-2 mb-2 ${mine ? 'justify-end' : ''}`}>
                            <input type="checkbox" checked={!!selectedIds[(m as any)._id]} onChange={() => toggleSelect((m as any)._id)} className="w-4 h-4 rounded" />
                            <span className="text-xs opacity-80">Select</span>
                          </label>
                        )}
                        {!selectMode && editingId !== (m as any)._id && (
                          <button
                            type="button"
                            className={`absolute top-1 ${mine ? 'right-1' : 'left-1'} w-7 h-7 sm:w-8 sm:h-8 rounded-full ${mine ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-lg hover:scale-110 shadow-lg`}
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(prev => prev === (m as any)._id ? null : (m as any)._id); }}
                          >
                            ⋯
                          </button>
                        )}
                        {openMenuId === (m as any)._id && (
                          <div className={`absolute ${mine ? 'right-0' : 'left-0'} top-10 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[140px]`}>
                            {mine && <button onClick={() => { setOpenMenuId(null); startEdit(m); }} className="block px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 w-full text-left text-sm font-medium transition-colors">✏️ Edit</button>}
                            <button onClick={() => { setOpenMenuId(null); startReply(m); }} className="block px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 w-full text-left text-sm font-medium transition-colors">↩️ Reply</button>
                            <button onClick={() => { setOpenMenuId(null); setShowReactForId((m as any)._id); }} className="block px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 w-full text-left text-sm font-medium transition-colors">😊 React</button>
                            <button onClick={() => { setOpenMenuId(null); setSelectMode(true); setSelectedIds({ [(m as any)._id]: true } as any); }} className="block px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-sm font-medium text-red-600 dark:text-red-400 transition-colors">🗑️ Delete</button>
                          </div>
                        )}
                        {showReactForId === (m as any)._id && (
                          <div className={`absolute ${mine ? 'right-0' : 'left-0'} -bottom-14 z-30 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-full shadow-2xl p-2 flex gap-1`} onMouseLeave={() => setShowReactForId(null)}>
                            {reactEmojis.map((e) => (
                              <button key={e} onClick={() => toggleReaction(m, e)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 text-xl sm:text-2xl transition-all hover:scale-125">{e}</button>
                            ))}
                          </div>
                        )}
                        {!!(m as any).attachments && (m as any).attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {(m as any).attachments.map((a: any, i: number) => {
                              if (a.type === 'image') return <img key={i} src={a.url} className="rounded-xl sm:rounded-2xl max-h-48 sm:max-h-72 object-contain shadow-lg" alt="attachment" />;
                              if (a.type === 'video') return <video key={i} src={a.url} className="rounded-xl sm:rounded-2xl max-h-48 sm:max-h-72 shadow-lg" controls />;
                              return <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all"><span>📎</span><span className="underline text-sm break-all">{a.name || 'file'}</span></a>;
                            })}
                          </div>
                        )}
                        {editingId === (m as any)._id ? (
                          <div className="space-y-2">
                            <input value={editText} onChange={(e) => setEditText(e.target.value)} className={`w-full px-3 py-2 rounded-lg text-sm sm:text-base ${mine ? 'bg-white/20 border border-white/30 text-white placeholder-white/60' : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'}`} />
                            <div className="flex gap-2">
                              <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs sm:text-sm font-medium hover:bg-green-600 transition-colors">Save</button>
                              <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-xs sm:text-sm font-medium hover:bg-gray-600 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          m.content && <div className="text-sm sm:text-base whitespace-pre-wrap break-words">{m.content}{(m as any).editedAt && <span className="ml-2 text-xs opacity-70">(edited)</span>}</div>
                        )}
                        {(m as any).replyToMessageId && (() => {
                          const ref = messages.find(mm => String((mm as any)._id) === String((m as any).replyToMessageId)) as any;
                          return (
                            <div className={`mt-2 rounded-lg px-3 py-2 text-xs sm:text-sm ${mine ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                              <span className="opacity-70">↩️ Replying to {ref ? (String((ref as any).senderId?._id || ref.senderId) === user?.id ? 'you' : 'them') : 'message'}:</span>
                              <span className="ml-1 font-medium">{ref?.content || '...'}</span>
                            </div>
                          );
                        })()}
                        {Array.isArray((m as any).reactions) && (m as any).reactions.length > 0 && (
                          <div className={`mt-2 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
                            {Object.entries((m as any).reactions.reduce((acc: any, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([emoji, count]: any) => {
                              const mineReacted = (m as any).reactions.some((r: any) => r.emoji === emoji && String(r.userId?._id || r.userId) === String(user?.id));
                              return <button key={emoji} onClick={() => toggleReaction(m, emoji)} className={`px-2 sm:px-3 py-1 rounded-full border-2 text-xs sm:text-sm font-medium transition-all hover:scale-110 shadow-md ${mineReacted ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>{emoji} {count}</button>
                            })}
                          </div>
                        )}
                        <div className={`text-[10px] sm:text-xs mt-2 opacity-0 group-hover:opacity-70 transition-opacity ${mine ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {absoluteTime(m.createdAt)}
                          {isLastMine && read && <span className="ml-2">✓✓ Seen</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              {replyToId && (() => {
                const ref = messages.find(m => String((m as any)._id) === String(replyToId)) as any;
                return (
                  <div className="px-3 sm:px-4 pt-3 flex items-center gap-2 sm:gap-3 bg-purple-50 dark:bg-purple-900/20">
                    <span className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">↩️ Replying:</span>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{ref?.content || 'message'}</span>
                    <button className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium hover:underline" onClick={cancelReply}>Cancel</button>
                  </div>
                );
              })()}
              {selectMode && (
                <div className="px-3 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => bulkDelete('for_me')} className="px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">Delete for me</button>
                  <button onClick={() => bulkDelete('for_everyone')} className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105">Delete for everyone</button>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{Object.keys(selectedIds).filter(k => selectedIds[k]).length} selected</span>
                </div>
              )}
              {pendingFiles.length > 0 && (
                <div className="px-3 sm:px-4 py-2 flex flex-wrap gap-2">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2">
                      <span>📎</span>
                      <span className="truncate max-w-[150px]">{f.name}</span>
                    </div>
                  ))}
                  {uploading && <div className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Uploading...</div>}
                </div>
              )}
              <form onSubmit={sendMessage} className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={pickFile} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-lg sm:text-xl hover:scale-110 transition-all shadow-md hover:shadow-lg flex items-center justify-center">📎</button>
                <button type="button" onClick={() => { setShowEmoji(v => !v); setShowStickers(false); }} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-lg sm:text-xl hover:scale-110 transition-all shadow-md hover:shadow-lg flex items-center justify-center">😊</button>
                <button type="button" onClick={() => { setShowStickers(v => !v); setShowEmoji(false); }} className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-xl hover:scale-110 transition-all shadow-md hover:shadow-lg items-center justify-center">🎟️</button>
                <button type="button" onClick={toggleSelectMode} className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-xl hover:scale-110 transition-all shadow-md hover:shadow-lg items-center justify-center">✔️</button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFilesChange} multiple />
                <input
                  value={text}
                  onChange={(e) => { setText(e.target.value); try { if (activeChat && socketRef.current && user?.id) socketRef.current.emit('user:typing', { chatId: activeChat._id, userId: user.id, username: '' }); } catch {} }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { if (editingId) { e.preventDefault(); cancelEdit(); } else if (selectMode) { e.preventDefault(); setSelectMode(false); setSelectedIds({}); } } }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-all"
                />
                <button type="submit" disabled={blockedByYou || blockedYou || uploading || (!text.trim() && pendingFiles.length === 0)} className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
                  <span className="hidden sm:inline">Send</span>
                  <span className="sm:hidden">➤</span>
                </button>
              </form>
              {showEmoji && (
                <div className="px-2 sm:px-4 pb-3 sm:pb-4">
                  <div className="bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-3 sm:p-4 flex flex-wrap gap-1 sm:gap-2 shadow-2xl max-h-48 overflow-y-auto">
                    {emojis.map((e, i) => (
                      <button key={i} type="button" onClick={() => setText(t => t + e)} className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl text-xl sm:text-2xl transition-all hover:scale-125">{e}</button>
                    ))}
                  </div>
                </div>
              )}
              {showStickers && (
                <div className="px-2 sm:px-4 pb-3 sm:pb-4">
                  <div className="bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-3 sm:p-4 shadow-2xl">
                    <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                      {stickerPacks.map((p, idx) => (
                        <button key={p.name} type="button" onClick={() => setStickerTab(idx)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${stickerTab === idx ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{p.name}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
                      {stickerPacks[stickerTab].urls.map((u, i) => (
                        <button key={i} type="button" onClick={() => setPendingFiles(prev => [...prev, { name: 'sticker', url: u, type: 'image' }])} className="aspect-square p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:ring-2 hover:ring-purple-400 transition-all hover:scale-110 shadow-md">
                          <img src={u} className="w-full h-full object-contain" alt="sticker" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat Info Sidebar */}
      {showInfo && activeChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center sm:justify-end" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-md h-full sm:h-screen bg-white dark:bg-gray-900 sm:border-l border-gray-200 dark:border-gray-800 p-4 sm:p-6 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInfo(false)} className="mb-4 sm:mb-6 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              ✕
            </button>
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-2xl ring-4 ring-white dark:ring-gray-900 mb-4">
                {(() => { const a = chatAvatar(activeChat); return a ? <img src={a} className="w-full h-full object-cover" alt={chatTitle(activeChat)} /> : <span>{chatTitle(activeChat)[0]}</span>; })()}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">{chatTitle(activeChat)}</h2>
              {activeChat.type === 'dm' && <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">@{activeChat.members.find(m => m._id !== user?.id)?.username}</p>}
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Disappearing Messages</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Auto-delete after 24 hours</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={disappearing24h} onChange={async (e) => { const val = e.target.checked; setDisappearing24h(val); try { await apiClient.patch(`/chats/${activeChat._id}/settings`, { disappearing24h: val }); } catch {} }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
                <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">Your Nickname</label>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Set a nickname..." className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-all" />
                <button onClick={async () => { try { await apiClient.patch(`/chats/${activeChat._id}/settings`, { nickname }); alert('Nickname saved! 💜'); } catch { alert('Failed to save nickname'); } }} className="w-full mt-3 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm sm:text-base">
                  Save Nickname
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm sm:text-base">Privacy & Safety</h3>
                <button onClick={async () => {
                  try {
                    const other = activeChat.members.find(m => m._id !== user?.id);
                    if (!other) return;
                    if (!blockedByYou) { await apiClient.post(`/users/${other._id}/block`); setBlockedByYou(true); }
                    else { await apiClient.delete(`/users/${other._id}/block`); setBlockedByYou(false); }
                  } catch {}
                }} className={`w-full px-4 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 ${blockedByYou ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'}`}>
                  {blockedByYou ? '🔓 Unblock User' : '🚫 Block User'}
                </button>
                {blockedYou && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">⚠️ This user has blocked you</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">New Message</h2>
              <button onClick={() => setShowNewChat(false)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                ✕
              </button>
            </div>
            <input value={searchTerm} onChange={async (e) => { setSearchTerm(e.target.value); try { const r = await apiClient.get(`/users/search/${encodeURIComponent(e.target.value)}`); const existingIds = new Set(chats.flatMap(c => c.members.map((m: any) => String(m._id))).filter(id => id !== user?.id)); const filtered = (r.data || []).filter((u: any) => !existingIds.has(String(u._id))); setSearchUsers(filtered); } catch {} }} placeholder="Search for users..." className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-all mb-4" />
            <div className="max-h-72 sm:max-h-96 overflow-y-auto space-y-2">
              {searchUsers.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Search to find someone to chat with</p>
                </div>
              ) : (
                searchUsers.map((u: any) => (
                  <button key={u._id} onClick={async () => { try { const r = await apiClient.post('/chats', { type: 'dm', memberIds: [u._id] }); setShowNewChat(false); setChats(prev => [r.data, ...prev]); try { if (socketRef.current) socketRef.current.emit('chat:join', r.data._id); } catch {} await selectChat(r.data); } catch {} }} className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 rounded-xl transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden shadow-lg ring-2 ring-white dark:ring-gray-800 flex-shrink-0">
                      <img src={u.profilePic || 'https://via.placeholder.com/48'} className="w-full h-full object-cover" alt={u.displayName || u.username} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{u.displayName || u.username}</div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</div>
                    </div>
                    <div className="flex-shrink-0 text-purple-600 dark:text-purple-400 text-xl">→</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Chats;