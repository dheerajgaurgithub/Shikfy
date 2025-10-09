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
  const [socketStatus, setSocketStatus] = useState<'idle'|'connecting'|'connected'|'error'>('idle');
  const connectAttemptsRef = useRef(0);
  const [typingOther, setTypingOther] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await apiClient.get('/chats');
        const list: Chat[] = res.data || [];
        setChats(list);
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
            s.on('user:status', (p:{ userId: string; online: boolean })=>{
              setOnlineMap(prev=> ({ ...prev, [p.userId]: p.online }));
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
  }, [targetChatId]);

  // cleanup socket on unmount
  useEffect(() => {
    return () => {
      try { socketRef.current?.disconnect(); } catch {}
    };
  }, []);

  const selectChat = async (chat: Chat) => {
    setActiveChat(chat);
    setLoadingMsgs(true);
    try {
      const res = await apiClient.get(`/messages/${chat._id}`);
      setMessages(res.data || []);
      // mark as read
      try { await apiClient.patch(`/messages/${chat._id}/read`); setUnreadMap(prev=>({...prev, [chat._id]: 0})); } catch {}
      // load settings & block state
      try {
        const ch = await apiClient.get(`/chats/${chat._id}`);
        const s = (ch.data?.settings)||{};
        setDisappearing24h(!!s.disappearing24h);
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
    if (!activeChat || !text.trim()) return;
    try {
      const res = await apiClient.post(`/messages`, { chatId: activeChat._id, content: text });
      setMessages(prev => [res.data, ...prev]);
      setText('');
    } catch (e) {
      console.error('Failed to send message', e);
    }
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 font-semibold text-gray-900 dark:text-white">Messages</div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[70vh] overflow-auto">
          {loadingChats ? (
            <div className="p-4 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            chats.map((c) => (
              <button key={c._id} onClick={() => selectChat(c)} className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${activeChat?._id===c._id?'bg-gray-50 dark:bg-gray-700':''}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {chatAvatar(c) ? (
                    <img src={chatAvatar(c)} className="w-full h-full object-cover" />
                  ) : (
                    <span>{chatTitle(c)[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white font-medium flex items-center justify-between">
                    <span>{chatTitle(c)}</span>
                    {!!unreadMap[c._id] && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">{unreadMap[c._id]}</span>}
                  </div>
                </div>
              </button>
            ))
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
                    {(() => { const oid = activeChat.members.find(m=>m._id!==user?.id)?._id; return oid && onlineMap[oid] ? <span className="inline-block w-2 h-2 rounded-full bg-green-500"/> : null; })()}
                  </div>
                  {activeChat.type==='dm' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {typingOther ? 'typing…' : `@${activeChat.members.find(m=>m._id!==user?.id)?.username}`}
                    </div>
                  )}
                </div>
              </button>
              {disappearing24h && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">24h</span>
              )}
            </div>
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
                  return (
                    <div key={m._id} className={`max-w-[75%] p-3 rounded-2xl ${bubble}`}>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${mine? 'opacity-90':'opacity-70'} ${mine? 'text-white/80':'text-gray-600'}`}>
                        {absoluteTime(m.createdAt)}
                        {isLastMine && read && <span className="ml-2">Seen {absoluteTime(m.createdAt)}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input value={text} onChange={(e)=>{ setText(e.target.value); try { if (activeChat && socketRef.current && user?.id) socketRef.current.emit('user:typing', { chatId: activeChat._id, userId: user.id, username: '' }); } catch {} }} placeholder="Message..." className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" />
              <button type="submit" disabled={blockedByYou || blockedYou} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-lg disabled:opacity-50">Send</button>
            </form>
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
    </div>
  );
};

export default Chats;
