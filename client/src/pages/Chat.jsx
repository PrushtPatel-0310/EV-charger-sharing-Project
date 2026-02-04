import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { chatService } from '../services/chatService.js';
import { SOCKET_URL } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/;

const containsContactInfo = (text) => EMAIL_REGEX.test(text) || PHONE_REGEX.test(text);

const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Chat = () => {
  const { chatId: routeChatId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(routeChatId || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const socketRef = useRef(null);
  const previousChatRef = useRef(null);
  const selectedChatRef = useRef(selectedChatId);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('message:new', ({ message }) => {
      if (message.chatId === selectedChatRef.current) {
        setMessages((prev) => [...prev, message]);
      }
      fetchChats(false);
    });

    socket.on('chat:updated', () => fetchChats(false));
    socket.on('message:read', () => fetchChats(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    selectedChatRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const state = location.state;
    if (state?.chargerId) {
      startChatFromIntent(state);
    }
  }, [location.state]);

  useEffect(() => {
    if (routeChatId && routeChatId !== selectedChatId) {
      setSelectedChatId(routeChatId);
    }
  }, [routeChatId, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;
    const prev = previousChatRef.current;
    if (prev && prev !== selectedChatId) {
      leaveRoom(prev);
    }
    joinRoom(selectedChatId);
    previousChatRef.current = selectedChatId;
    fetchMessages(selectedChatId);
    markRead(selectedChatId);
  }, [selectedChatId]);

  const joinRoom = (chatId) => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit('join', chatId);
    previousChatRef.current = chatId;
  };

  const leaveRoom = (chatId) => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit('leave', chatId);
  };

  const fetchChats = async (selectFirst = true) => {
    try {
      setLoadingChats(true);
      const response = await chatService.list();
      const payload = response.data || response;
      const combined = [
        ...(payload?.data?.chats || []),
        ...(payload?.chats || []),
        ...(payload?.data?.booked || payload?.booked || []),
        ...(payload?.data?.enquiries || payload?.enquiries || []),
      ].filter(Boolean);
      const byId = new Map();
      combined.forEach((chat) => {
        if (chat?._id) byId.set(chat._id, chat);
      });
      const list = Array.from(byId.values());
      setChats(list);
      if (!selectedChatId && selectFirst && list.length) {
        setSelectedChatId(list[0]._id);
      }
    } catch (err) {
      setError('Unable to load chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const startChatFromIntent = async ({ chargerId, bookingId }) => {
    try {
      setCreatingChat(true);
      const res = await chatService.startOrUpgrade({ chargerId, bookingId });
      const newChatId = res.data.chat._id;
      await fetchChats(false);
      setSelectedChatId(newChatId);
      navigate(`/chats/${newChatId}`, { replace: true, state: {} });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to start chat');
    } finally {
      setCreatingChat(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const res = await chatService.getMessages(chatId);
      setMessages(res.data.messages || []);
    } catch (err) {
      setError('Unable to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const markRead = async (chatId) => {
    try {
      await chatService.markRead(chatId);
      fetchChats(false);
    } catch (err) {
      // ignore
    }
  };

  const handleSelectChat = (chatId) => {
    if (!chatId) return;
    setError('');
    setSelectedChatId(chatId);
    navigate(`/chats/${chatId}`, { replace: true });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (containsContactInfo(input)) {
      setError('Sharing contact information is not allowed.');
      return;
    }
    try {
      setError('');
      const trimmed = input.trim();
      setInput('');
      const res = await chatService.sendMessage(selectedChatId, trimmed);
      setMessages((prev) => [...prev, res.data.message]);
      fetchChats(false);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to send message';
      setError(message);
    }
  };

  const selectedChat = useMemo(() => chats.find((c) => c._id === selectedChatId), [chats, selectedChatId]);

  const getChatTime = (chat) => {
    const time = chat.lastMessage?.createdAt || chat.lastMessage?.at || chat.updatedAt || chat.createdAt || 0;
    return new Date(time).getTime();
  };

  const sortedChats = useMemo(() => {
    const list = [...chats];
    return list.sort((a, b) => getChatTime(b) - getChatTime(a));
  }, [chats]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-emerald-50/70 px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-3xl border border-emerald-100 bg-white/90 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-emerald-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
            <p className="text-sm text-emerald-700">Stay on EVCharge. No phone or email sharing.</p>
          </div>
          {creatingChat && <span className="text-sm font-semibold text-emerald-600">Creating chat...</span>}
        </div>

        {error && (
          <div className="mx-6 my-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-b-3xl lg:h-[75vh] lg:grid-cols-[320px_1fr]">
          <aside className="flex flex-col border-r border-emerald-100 bg-white/95">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Conversations</p>
                <p className="text-xs text-gray-500">{sortedChats.length} total</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingChats ? (
                <div className="px-4 py-6 text-sm text-gray-500">Loading chats...</div>
              ) : sortedChats.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">No chats yet.</div>
              ) : (
                sortedChats.map((chat) => {
                  const chargerTitle = chat.chargerId?.title || chat.chargerTitle || 'Charger';
                  const ownerName = chat.ownerId?.name || 'Owner';
                  const lastText = chat.lastMessage?.text || chat.lastMessage?.messageText || chat.lastMessage?.message || 'No messages yet';
                  const lastTime = formatTime(chat.lastMessage?.at || chat.lastMessage?.createdAt || chat.updatedAt);
                  const isActive = selectedChatId === chat._id;

                  return (
                    <button
                      key={chat._id}
                      onClick={() => handleSelectChat(chat._id)}
                      className={`group flex w-full items-center gap-3 px-4 py-3 transition ${
                        isActive ? 'bg-emerald-100/80' : 'hover:bg-emerald-50'
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-semibold text-white">
                        {(chargerTitle || 'C').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">{chargerTitle}</p>
                          <span className="text-[11px] text-gray-500">{lastTime}</span>
                        </div>
                        <p className="truncate text-xs text-gray-600">Owner: {ownerName}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                          <span className="truncate">{lastText}</span>
                          {chat.unread > 0 && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#e8fff2_0%,#ffffff_40%,#ffffff_100%)]">
            {selectedChat ? (
              <>
                <div className="flex items-center justify-between border-b border-emerald-100 bg-white/80 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-semibold text-white">
                      {(selectedChat.chargerId?.title || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">{selectedChat.chargerId?.title || 'Charger'}</p>
                      <p className="text-xs text-gray-600">Owner: {selectedChat.ownerId?.name || 'Owner'} • {selectedChat.chatType === 'BOOKED' ? 'Booking chat' : 'Enquiry chat'}</p>
                    </div>
                  </div>
                  {selectedChat.bookingContext && (
                    <div className="text-right text-[11px] text-gray-600">
                      <div className="truncate">{selectedChat.bookingContext.location?.address}</div>
                      {selectedChat.bookingContext.bookingDate && (
                        <div>Date: {new Date(selectedChat.bookingContext.bookingDate).toLocaleDateString()}</div>
                      )}
                      <div>Charger: {selectedChat.bookingContext.chargerType}</div>
                      <div>Paid: ₹{selectedChat.bookingContext.paidAmount}</div>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user?._id;
                      return (
                        <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              isMine ? 'bg-[#d9fdd3] text-gray-900' : 'border border-emerald-50 bg-white text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.messageText}</p>
                            <div className="mt-1 text-[10px] text-gray-500 text-right">{formatTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-emerald-100 bg-white/90 px-4 py-3">
                  <div className="flex-1 rounded-full border border-emerald-100 bg-gray-50 px-4">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message"
                      className="h-11 w-full bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex h-11 items-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    disabled={!input.trim()}
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-500">
                {loadingChats ? 'Loading chats...' : 'Select or start a chat to begin'}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Chat;
