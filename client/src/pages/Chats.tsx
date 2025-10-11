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
        // seed lastSeen map from populated members
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
          } else if (list[0]) {
            // if target not found, leave unselected
          }
        }

        // compute unread counts (best-effort, first 50)
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

        // setup socket and join rooms
        try {
          if (!socketRef.current) {
            const s = socketIO(import.meta.env.VITE_API_BASE?.replace('/api','') || 'http://localhost:3001', { withCredentials: true });
            socketRef.current = s;
            s.on('connect', ()=>{
              // join each chat room
              list.forEach(c=> s.emit('chat:join', c._id));
            });
            s.on('message:new', (data:any)=>{
              setUnreadMap(prev=>{
                // if not active or different chat, increment unread for that chat
                if (!activeChat || data.chatId !== activeChat._id) {
                  const next = { ...prev };
                  next[data.chatId] = (next[data.chatId]||0) + 1;
                  return next;
                }
                return prev;
              });
              // if the active chat matches, prepend message
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

            // typing indicator
            s.on('user:typing', (data:any)=>{
              if (!activeChat) return;
              const otherId = activeChat.members.find(m=> m._id !== user?.id)?._id;
              if (data?.chatId === activeChat._id && otherId && data.userId === otherId) {
                setTypingOther(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(()=> setTypingOther(false), 2500);
              }
            });

            // online status broadcast
            s.on('user:status', (p:{ userId: string; online: boolean; lastSeen?: string })=>{
              setOnlineMap(prev=> ({ ...prev, [p.userId]: p.online }));
              if (p.lastSeen) setLastSeenMap(prev=> ({ ...prev, [p.userId]: p.lastSeen! }));
            });

            // message updated/deleted
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
            // already connected, ensure we joined latest rooms
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetChatId, folder]);

  // cleanup socket on unmount
  useEffect(() => {
    return () => {
      try { socketRef.current?.disconnect(); } catch {}
    };
  }, []);

  // Close menus/popovers on outside click
  useEffect(() => {
    const onDocClick = () => { setOpenMenuId(null); setShowReactForId(null); };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Reply / reactions helpers (component scope)
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
    setLoadingMsgs(true);
    try {
      const res = await apiClient.get(`/messages/${chat._id}`);
      setMessages(res.data || []);
      // mark as read
      try {
        await apiClient.patch(`/messages/${chat._id}/read`);
        setUnreadMap(prev=>({...prev, [chat._id]: 0}));
        // refresh unread chats count for sidebar badge
        try {
          const uc = await apiClient.get('/chats/unread-count');
          const count = Number(uc.data?.count||0);
          window.dispatchEvent(new CustomEvent('chats:unread', { detail: { count } }));
        } catch {}
      } catch {}
      // load settings & block state
      try {
        const ch = await apiClient.get(`/chats/${chat._id}`);
        const s = (ch.data?.settings)||{};
        setDisappearing24h(!!s.disappearing24h);
        // determine request acceptance for me
        try {
          const myInbox = (ch.data?.inboxes||[]).find((e:any)=> String(e.userId)===String(user?.id));
          // if exists and not accepted, we can show banner
          setBlockedByYou(false); // keep old state usage
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
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-white">Messages</div>
          <button onClick={()=> setShowNewChat(true)} title="New chat" aria-label="New chat" className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">＋</button>
        </div>
        <div className="px-4 pb-2 flex gap-2">
          <button onClick={()=> setFolder('' as any)} className={`px-3 py-1.5 rounded-full text-xs ${folder===''? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>All</button>
          <button onClick={()=> setFolder('primary')} className={`px-3 py-1.5 rounded-full text-xs ${folder==='primary'? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Primary {folderCounts.primary? <span className="ml-1 px-1.5 rounded-full bg-white/20">{folderCounts.primary}</span> : null}</button>
          <button onClick={()=> setFolder('general')} className={`px-3 py-1.5 rounded-full text-xs ${folder==='general'? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>General {folderCounts.general? <span className="ml-1 px-1.5 rounded-full bg-white/20">{folderCounts.general}</span> : null}</button>
          <button onClick={()=> setFolder('requests')} className={`px-3 py-1.5 rounded-full text-xs ${folder==='requests'? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Requests {folderCounts.requests? <span className="ml-1 px-1.5 rounded-full bg-white/20">{folderCounts.requests}</span> : null}</button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[70vh] overflow-auto">
          {loadingChats ? (
            <div className="p-4 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : chats.length===0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div>No conversations here.</div>
              <button onClick={()=> setShowNewChat(true)} className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white">Start a new chat</button>
            </div>
          ) : (
            chats.map((c) => {
              const other = c.members.find(m=> m._id!==user?.id);
              const online = other? onlineMap[other._id] : false;
              const myInbox = ((c as any).inboxes||[]).find((e:any)=> String(e.userId)===String(user?.id));
              return (
                <button key={c._id} onClick={() => selectChat(c)} className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${activeChat?._id===c._id?'bg-gray-50 dark:bg-gray-700':''}`}>
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                    {chatAvatar(c) ? (
                      <img src={chatAvatar(c)} className="w-full h-full object-cover" />
                    ) : (
                      <span>{chatTitle(c)[0]}</span>
                    )}
                    {online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">{chatTitle(c)} {myInbox && myInbox.folder==='requests' && myInbox.accepted===false && (<span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">Request</span>)}</span>
                      {!!unreadMap[c._id] && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">{unreadMap[c._id]}</span>}
                    </div>
                    <div className={`text-xs ${online? 'text-green-500':'text-gray-500 dark:text-gray-400'}`}>
                      {online ? 'Active now' : relativeTime(other && (lastSeenMap[other._id] || (other as any)?.lastSeen))}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">Select a chat</div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button onClick={()=>setShowInfo(true)} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-pink-500 text-white flex items-center justify-center">
                  {(() => { const a = chatAvatar(activeChat); return a ? <img src={a} className="w-full h-full object-cover"/> : <span>{chatTitle(activeChat)[0]}</span>; })()}
                </div>
                <div className="text-left">
                  <div className="text-gray-900 dark:text-white font-semibold leading-tight flex items-center gap-2">
                    <span>{chatTitle(activeChat)}</span>
                  </div>
                  {activeChat.type==='dm' && (()=>{
                    const other = activeChat.members.find(m=>m._id!==user?.id);
                    const otherId = other?._id;
                    const online = otherId ? onlineMap[otherId] : false;
                    const lastSeen = otherId ? (lastSeenMap[otherId] || (other as any)?.lastSeen) : undefined;
                    return (
                      <div className={`text-xs flex items-center gap-2 ${online? 'text-green-500':'text-gray-500 dark:text-gray-400'}`}>
                        {typingOther ? (
                          <div className="flex items-center gap-1 text-blue-500">
                            <span className="inline-flex items-center">typing
                              <span className="inline-block w-1 h-1 bg-current rounded-full ml-1 animate-bounce [animation-delay:-0.2s]"></span>
                              <span className="inline-block w-1 h-1 bg-current rounded-full ml-1 animate-bounce [animation-delay:-0.1s]"></span>
                              <span className="inline-block w-1 h-1 bg-current rounded-full ml-1 animate-bounce"></span>
                            </span>
                          </div>
                        ) : online ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"/>
                            <span>Active now</span>
                            {/* both online indicator: me + other */}
                            <span className="inline-flex items-center gap-1 ml-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500"/>
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500"/>
                            </span>
                          </div>
                        ) : (
                          <span>{relativeTime(lastSeen)}</span>
                        )}
                      </div>
                    );
                  })()}
                  {activeChat.type==='dm' && (()=>{
                    const other = activeChat.members.find(m=>m._id!==user?.id) as any;
                    const sm = other?.statusMessage;
                    return sm ? (<div className="text-xs text-gray-500 dark:text-gray-400">{sm}</div>) : null;
                  })()}
                </div>
              </button>
              {disappearing24h && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">24h</span>
              )}
              {/* Move menu */}
              <div className="relative ml-2">
                <button onClick={()=> setShowMoveMenu(v=> !v)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Move</button>
                {showMoveMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow z-10">
                    <button onClick={async()=>{ try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { folder: 'primary', accepted: true }); setShowMoveMenu(false); if(folder!=='primary') setFolder('primary'); else await selectChat(activeChat!); } catch {} }} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Primary</button>
                    <button onClick={async()=>{ try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { folder: 'general', accepted: true }); setShowMoveMenu(false); if(folder!=='general') setFolder('general'); else await selectChat(activeChat!); } catch {} }} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">General</button>
                  </div>
                )}
              </div>
            </div>
            {/* Request banner if not accepted for me */}
            {(() => {
              const myInbox = (window as any)._chat_myInbox;
              if (myInbox && myInbox.accepted===false) {
                return (
                  <div className="px-4 pt-3">
                    <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
                      <div>This is a message request. Accept to move it to Primary.</div>
                      <div className="flex gap-2">
                        <button onClick={async()=>{ try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { accepted: true, folder: 'primary' }); setFolder('primary'); await selectChat(activeChat!); } catch {} }} className="px-3 py-1.5 rounded bg-blue-600 text-white">Accept</button>
                        <button onClick={async()=>{ try { await apiClient.patch(`/chats/${(activeChat as any)._id}/inbox`, { accepted: false, folder: 'requests' }); await selectChat(activeChat!); } catch {} }} className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700">Keep in Requests</button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex-1 p-4 overflow-auto flex flex-col-reverse gap-3">
              {loadingMsgs ? (
                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = typeof (m as any).senderId === 'string' ? (m as any).senderId : (m as any).senderId?._id;
                  const mine = senderId === user?.id;
                  const bubble = mine ? 'self-end bg-blue-600 text-white' : 'self-start bg-gray-200 text-black';
                  const otherId = activeChat?.members.find(mm=>mm._id!==user?.id)?._id;
                  const isLastMine = mine && idx===0; // messages are reversed (most recent first)
                  const read = Array.isArray((m as any).readBy) && otherId ? ((m as any).readBy as any[]).some((r:any)=> (typeof r==='string'? r : r._id)===otherId) : (m as any).status==='read';
                  const beginLong = () => {
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(()=> setShowReactForId((m as any)._id), 500);
                  };
                  const cancelLong = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } };
                  return (
                    <div
                      key={m._id}
                      className={`relative group max-w-[75%] p-3 rounded-2xl ${bubble}`}
                      onMouseLeave={()=>{ if (openMenuId===(m as any)._id) setOpenMenuId(null); cancelLong(); }}
                      onClick={(e)=> e.stopPropagation()}
                      onTouchStart={beginLong}
                      onTouchEnd={cancelLong}
                      onMouseDown={beginLong}
                      onMouseUp={cancelLong}
                    >
                      {selectMode && (
                        <label className={`flex items-center gap-2 mb-1 ${mine?'justify-end':''}`}>
                          <input type="checkbox" checked={!!selectedIds[(m as any)._id]} onChange={()=>toggleSelect((m as any)._id)} />
                          <span className="text-[10px] opacity-70">Select</span>
                        </label>
                      )}
                      {!selectMode && editingId!==(m as any)._id && (
                        <button
                          type="button"
                          title="Message actions"
                          aria-label="Message actions"
                          className={`absolute -top-2 ${mine? '-right-2':'-left-2'} w-6 h-6 rounded-full bg-black/10 text-black/70 dark:bg-white/10 dark:text-white/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center`}
                          onClick={(e)=>{ e.stopPropagation(); setOpenMenuId(prev=> prev===(m as any)._id ? null : (m as any)._id); }}>
                          ⋯
                        </button>
                      )}
                      {openMenuId===(m as any)._id && (
                        <div className={`absolute ${mine? 'right-0':'left-0'} -top-1 mt-6 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm`}>
                          {mine && <button onClick={()=>{ setOpenMenuId(null); startEdit(m); }} className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">Edit</button>}
                          <button onClick={()=>{ setOpenMenuId(null); startReply(m); }} className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">Reply</button>
                          <button onClick={()=>{ setOpenMenuId(null); setShowReactForId((m as any)._id); }} className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">React</button>
                          <button onClick={()=>{ setOpenMenuId(null); setSelectMode(true); setSelectedIds({ [(m as any)._id]: true } as any); }} className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left">Delete</button>
                        </div>
                      )}
                      {showReactForId===(m as any)._id && (
                        <div className={`absolute ${mine? 'right-0':'left-0'} -top-1 mt-16 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow p-1 flex gap-1`}
                          onMouseLeave={()=> setShowReactForId(null)}>
                          {reactEmojis.map((e)=> (
                            <button key={e} onClick={()=>toggleReaction(m, e)} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg">{e}</button>
                          ))}
                        </div>
                      )}
                      {!!(m as any).attachments && (m as any).attachments.length>0 && (
                        <div className="space-y-2 mb-2">
                          {(m as any).attachments.map((a:any, i:number)=>{
                            if (a.type==='image') return <img key={i} src={a.url} className="rounded-xl max-h-72 object-contain"/>;
                            if (a.type==='video') return <video key={i} src={a.url} className="rounded-xl max-h-72" controls />;
                            return <a key={i} href={a.url} target="_blank" rel="noreferrer" className="underline break-all">{a.name||'file'}</a>;
                          })}
                        </div>
                      )}
                      {editingId===(m as any)._id ? (
                        <div className="space-y-2">
                          <input value={editText} onChange={(e)=>setEditText(e.target.value)} className="w-full px-2 py-1 rounded bg-white/20 border border-white/30" />
                          <div className={`text-[10px] flex gap-2 ${mine? 'text-white/80':'text-gray-600'}`}>
                            <button onClick={saveEdit} className="underline">Save</button>
                            <button onClick={cancelEdit} className="underline">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        m.content && <div className="text-sm whitespace-pre-wrap">{m.content}{(m as any).editedAt && <span className="ml-2 text-[10px] opacity-70">(edited)</span>}</div>
                      )}
                      {/* Quoted reply preview inline */}
                      { (m as any).replyToMessageId && (()=>{
                        const ref = messages.find(mm=> String((mm as any)._id)===String((m as any).replyToMessageId)) as any;
                        return (
                          <div className={`mt-2 rounded bg-black/10 dark:bg-white/10 px-2 py-1 text-xs ${mine? 'text-white/90':'text-gray-700'}`}>
                            Replying to {ref ? (String((ref as any).senderId?._id||ref.senderId)===user?.id?'you': 'them') : 'message'}: {ref?.content || '...'}
                          </div>
                        );
                      })() }
                      {/* Reactions chips */}
                      {Array.isArray((m as any).reactions) && (m as any).reactions.length>0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${mine? 'justify-end':''}`}>
                          {Object.entries((m as any).reactions.reduce((acc:any, r:any)=>{ acc[r.emoji]=(acc[r.emoji]||0)+1; return acc; }, {} as Record<string,number>)).map(([emoji,count]:any)=>{
                            const mineReacted = (m as any).reactions.some((r:any)=> r.emoji===emoji && String(r.userId?._id||r.userId)===String(user?.id));
                            return <button key={emoji} onClick={()=>toggleReaction(m, emoji)} className={`px-2 py-0.5 rounded-full border text-xs ${mineReacted? 'bg-blue-600 text-white border-blue-600':'bg-white/30 dark:bg-black/20 text-current border-gray-300 dark:border-gray-600'}`}>{emoji} {count}</button>
                          })}
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 ${mine? 'text-white/80':'text-gray-600'} opacity-0 group-hover:opacity-100 transition`}> 
                        {absoluteTime(m.createdAt)}
                        {isLastMine && read && <span className="ml-2">Seen {absoluteTime(m.createdAt)}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <button type="button" onClick={pickFile} title="Attach file" aria-label="Attach file" className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">📎</button>
              <button type="button" onClick={()=>{ setShowEmoji(v=>!v); setShowStickers(false); }} title="Emoji picker" aria-label="Emoji picker" className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">😊</button>
              <button type="button" onClick={()=>{ setShowStickers(v=>!v); setShowEmoji(false); }} title="Stickers" aria-label="Stickers" className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">🎟️</button>
              <button type="button" onClick={toggleSelectMode} title="Toggle selection" aria-label="Toggle selection" className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">✔️</button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFilesChange} multiple />
              <input
                value={text}
                onChange={(e)=>{ setText(e.target.value); try { if (activeChat && socketRef.current && user?.id) socketRef.current.emit('user:typing', { chatId: activeChat._id, userId: user.id, username: '' }); } catch {} }}
                onKeyDown={(e)=>{ if (e.key==='Escape') { if (editingId) { e.preventDefault(); cancelEdit(); } else if (selectMode) { e.preventDefault(); setSelectMode(false); setSelectedIds({}); } } }}
                placeholder="Message..."
                aria-label="Message input"
                className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              <button type="submit" disabled={blockedByYou || blockedYou || (uploading) || (!text.trim() && pendingFiles.length===0)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-lg disabled:opacity-50" title="Send message" aria-label="Send message">Send</button>
            </form>
            {replyToId && (()=>{
              const ref = messages.find(m=> String((m as any)._id)===String(replyToId)) as any;
              return (
                <div className="px-3 pb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span className="opacity-70">Replying to:</span>
                  <span className="truncate max-w-[50%]">{ref?.content || 'message'}</span>
                  <button className="ml-auto underline" onClick={cancelReply}>Cancel</button>
                </div>
              );
            })()}
            {selectMode && (
              <div className="px-3 pb-3 flex items-center gap-2">
                <button onClick={()=>bulkDelete('for_me')} className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700">Delete for me</button>
                <button onClick={()=>bulkDelete('for_everyone')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete for everyone</button>
                <span className="text-xs text-gray-500">{Object.keys(selectedIds).filter(k=>selectedIds[k]).length} selected</span>
              </div>
            )}
            {(pendingFiles.length>0) && (
              <div className="px-3 pb-3 flex flex-wrap gap-2">
                {pendingFiles.map((f, i)=> (
                  <div key={i} className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{f.name}</div>
                ))}
                {uploading && <div className="text-xs text-gray-500">Uploading…</div>}
              </div>
            )}
            {showEmoji && (
              <div className="px-3 pb-3">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 max-w-full flex flex-wrap gap-1">
                  {emojis.map((e,i)=> (
                    <button key={i} type="button" onClick={()=> setText(t=> t + e)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl">{e}</button>
                  ))}
                </div>
              </div>
            )}
            {showStickers && (
              <div className="px-3 pb-3">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2">
                  <div className="flex gap-2 mb-2">
                    {stickerPacks.map((p, idx)=> (
                      <button key={p.name} type="button" onClick={()=>setStickerTab(idx)} className={`px-2 py-1 rounded text-xs ${stickerTab===idx? 'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{p.name}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {stickerPacks[stickerTab].urls.map((u, i)=> (
                      <button key={i} type="button" onClick={()=> setPendingFiles(prev=> [...prev, { name: 'sticker', url: u, type: 'image' }])} className="p-1 bg-gray-50 dark:bg-gray-700 rounded hover:ring-2 hover:ring-blue-400">
                        <img src={u} className="w-12 h-12 object-contain"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showInfo && activeChat && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={()=>setShowInfo(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-pink-500 text-white flex items-center justify-center">
                {(() => { const a = chatAvatar(activeChat); return a ? <img src={a} className="w-full h-full object-cover"/> : <span>{chatTitle(activeChat)[0]}</span>; })()}
              </div>
              <div>
                <div className="text-gray-900 dark:text-white font-semibold">{chatTitle(activeChat)}</div>
                {activeChat.type==='dm' && <div className="text-xs text-gray-500 dark:text-gray-400">@{activeChat.members.find(m=>m._id!==user?.id)?.username}</div>}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-800 dark:text-gray-200">Disappearing messages (24h)</div>
                <input type="checkbox" checked={disappearing24h} onChange={async (e)=>{
                  const val = e.target.checked; setDisappearing24h(val);
                  try { await apiClient.patch(`/chats/${activeChat._id}/settings`, { disappearing24h: val }); } catch {}
                }} />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Your nickname</label>
                <input value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="Optional" className="w-full mt-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" />
                <div className="text-right mt-2">
                  <button onClick={async ()=>{ try { await apiClient.patch(`/chats/${activeChat._id}/settings`, { nickname }); alert('Saved'); } catch { alert('Failed'); } }} className="px-3 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <button onClick={async ()=>{
                  try {
                    const other = activeChat.members.find(m=>m._id!==user?.id);
                    if (!other) return;
                    if (!blockedByYou) { await apiClient.post(`/users/${other._id}/block`); setBlockedByYou(true); }
                    else { await apiClient.delete(`/users/${other._id}/block`); setBlockedByYou(false); }
                  } catch {}
                }} className={`px-3 py-2 rounded-lg ${blockedByYou? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200':'bg-red-600 text-white'}`}>{blockedByYou? 'Unblock' : 'Block'}</button>
                {blockedYou && <div className="text-xs text-red-500 mt-2">They have blocked you</div>}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={()=> setShowNewChat(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-4" onClick={(e)=> e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">New message</div>
            <input value={searchTerm} onChange={async (e)=>{ setSearchTerm(e.target.value); try { const r = await apiClient.get(`/users/search/${encodeURIComponent(e.target.value)}`); const existingIds = new Set(chats.flatMap(c=> c.members.map((m:any)=> String(m._id))).filter(id=> id!==user?.id)); const filtered = (r.data||[]).filter((u:any)=> !existingIds.has(String(u._id)) ); setSearchUsers(filtered); } catch {} }} placeholder="Search users" className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mb-3" />
            <div className="max-h-72 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
              {searchUsers.map((u:any)=> (
                <button key={u._id} onClick={async()=>{ try { const r = await apiClient.post('/chats', { type: 'dm', memberIds: [u._id] }); setShowNewChat(false); setChats(prev=> [r.data, ...prev]); try { if (socketRef.current) socketRef.current.emit('chat:join', r.data._id); } catch {} await selectChat(r.data); } catch {} }} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2">
                  <img src={u.profilePic||'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{u.displayName||u.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</div>
                  </div>
                </button>
              ))}
              {searchUsers.length===0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Search to start a new chat.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chats;
