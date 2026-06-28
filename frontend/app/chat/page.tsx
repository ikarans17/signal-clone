"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

const EMOJIS = ["😀","😂","😍","🥰","😎","🤔","👍","👎","❤️","🔥","🎉","😭","🙏","💪","✅","🚀","💯","😅","🤣","😊","🥺","😤","🤩","😴","🤯","👏","🎊","💀","😇","🤝"];

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar: string;
  is_online: boolean;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  status: string;
  created_at: string;
}

interface Conversation {
  id: number;
  is_group: boolean;
  group_name: string | null;
  members: User[];
  last_message: { content: string; created_at: string } | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!stored || !token) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    fetchConversations(u.id);
    connectWebSocket(u.id);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWebSocket = (userId: number) => {
    const ws = new WebSocket(`${WS}/ws/${userId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === "typing") {
        setTypingUser("typing...");
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
      }
    };
    wsRef.current = ws;
  };

  const fetchConversations = async (userId: number) => {
    try {
      const res = await axios.get(`${API}/api/conversations/${userId}`);
      setConversations(res.data);
    } catch { toast.error("Failed to load conversations"); }
  };

  const fetchMessages = async (convId: number) => {
    try {
      const res = await axios.get(`${API}/api/messages/${convId}`);
      setMessages(res.data);
    } catch { toast.error("Failed to load messages"); }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/users`);
      setAllUsers(res.data.filter((u: User) => u.id !== user?.id));
    } catch { toast.error("Failed to load users"); }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setTypingUser(null);
    setShowEmoji(false);
    setShowProfile(false);
    fetchMessages(conv.id);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (wsRef.current && selectedConv && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: selectedConv.id,
        sender_id: user?.id
      }));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      await axios.post(`${API}/api/messages`, {
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content: newMessage,
      });
      setNewMessage("");
      setShowEmoji(false);
      fetchMessages(selectedConv.id);
      fetchConversations(user.id);
    } catch { toast.error("Failed to send message"); }
  };

  const deleteConversation = async (convId: number) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await axios.delete(`${API}/api/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (selectedConv?.id === convId) setSelectedConv(null);
      toast.success("Conversation deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const startNewChat = async (targetUser: User) => {
    try {
      await axios.post(`${API}/api/conversations`, {
        member_ids: [user?.id, targetUser.id],
        is_group: false,
      });
      await fetchConversations(user!.id);
      setShowNewChat(false);
      toast.success(`Chat started with ${targetUser.display_name}`);
    } catch { toast.error("Failed to create conversation"); }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error("Enter group name"); return; }
    if (selectedMembers.length < 2) { toast.error("Select at least 2 members"); return; }
    try {
      await axios.post(`${API}/api/conversations`, {
        member_ids: [user?.id, ...selectedMembers],
        is_group: true,
        group_name: groupName,
      });
      await fetchConversations(user!.id);
      setShowNewGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      toast.success("Group created!");
    } catch { toast.error("Failed to create group"); }
  };

  const toggleMember = (uid: number) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const getConvName = (conv: Conversation) => {
    if (conv.is_group) return conv.group_name;
    const other = conv.members.find(m => m.id !== user?.id);
    return other?.display_name || "Unknown";
  };

  const getConvAvatar = (conv: Conversation) => {
    if (conv.is_group) return null;
    const other = conv.members.find(m => m.id !== user?.id);
    return other?.avatar || null;
  };

  const isOnline = (conv: Conversation) => {
    if (conv.is_group) return false;
    const other = conv.members.find(m => m.id !== user?.id);
    return other?.is_online || false;
  };

  const formatTime = (dt: string) => {
    return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filtered = conversations.filter(c =>
    getConvName(c)?.toLowerCase().includes(search.toLowerCase())
  );

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const otherUser = selectedConv ? selectedConv.members.find(m => m.id !== user?.id) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111b21" }}>

      {/* NEW CHAT MODAL */}
      {showNewChat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#202c33", borderRadius: "16px", padding: "24px", width: "360px", maxHeight: "500px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ color: "#e9edef", fontSize: "18px" }}>New Chat</h3>
              <button onClick={() => setShowNewChat(false)} style={{ background: "none", border: "none", color: "#8696a0", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
              style={{ background: "#2a3942", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#e9edef", fontSize: "14px", outline: "none", marginBottom: "12px" }} />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {allUsers.filter(u => u.display_name.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                <div key={u.id} onClick={() => startNewChat(u)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", borderRadius: "8px", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#2a3942")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {u.avatar ? <img src={u.avatar} style={{ width: "40px", height: "40px", borderRadius: "50%" }} /> :
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px" }}>{u.display_name[0]}</div>}
                  <div>
                    <p style={{ color: "#e9edef", fontSize: "15px" }}>{u.display_name}</p>
                    <p style={{ color: "#8696a0", fontSize: "12px" }}>@{u.username}</p>
                  </div>
                  <div style={{ marginLeft: "auto", width: "8px", height: "8px", borderRadius: "50%", background: u.is_online ? "#00a884" : "#8696a0" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {showNewGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#202c33", borderRadius: "16px", padding: "24px", width: "360px", maxHeight: "560px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ color: "#e9edef", fontSize: "18px" }}>New Group</h3>
              <button onClick={() => setShowNewGroup(false)} style={{ background: "none", border: "none", color: "#8696a0", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <input placeholder="Group name..." value={groupName} onChange={e => setGroupName(e.target.value)}
              style={{ background: "#2a3942", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#e9edef", fontSize: "14px", outline: "none", marginBottom: "12px" }} />
            <p style={{ color: "#8696a0", fontSize: "13px", marginBottom: "8px" }}>Select members ({selectedMembers.length} selected)</p>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {allUsers.map(u => (
                <div key={u.id} onClick={() => toggleMember(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", borderRadius: "8px", cursor: "pointer", background: selectedMembers.includes(u.id) ? "#2a3942" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#2a3942")}
                  onMouseLeave={e => (e.currentTarget.style.background = selectedMembers.includes(u.id) ? "#2a3942" : "transparent")}
                >
                  {u.avatar ? <img src={u.avatar} style={{ width: "40px", height: "40px", borderRadius: "50%" }} /> :
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px" }}>{u.display_name[0]}</div>}
                  <p style={{ color: "#e9edef", fontSize: "15px", flex: 1 }}>{u.display_name}</p>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #00a884", background: selectedMembers.includes(u.id) ? "#00a884" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px" }}>
                    {selectedMembers.includes(u.id) ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={createGroup} style={{ background: "#00a884", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginTop: "12px" }}>
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfile && selectedConv && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#202c33", borderRadius: "16px", padding: "32px", width: "320px", textAlign: "center" }}>
            <button onClick={() => setShowProfile(false)} style={{ position: "absolute", background: "none", border: "none", color: "#8696a0", fontSize: "20px", cursor: "pointer", marginLeft: "240px", marginTop: "-16px" }}>✕</button>
            {getConvAvatar(selectedConv) ? (
              <img src={getConvAvatar(selectedConv)!} style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 16px" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: selectedConv.is_group ? "#7b68ee" : "#00a884", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", color: "white", margin: "0 auto 16px" }}>
                {selectedConv.is_group ? "👥" : getConvName(selectedConv)?.[0]}
              </div>
            )}
            <h2 style={{ color: "#e9edef", fontSize: "20px", marginBottom: "8px" }}>{getConvName(selectedConv)}</h2>
            {!selectedConv.is_group && otherUser && (
              <>
                <p style={{ color: "#8696a0", fontSize: "14px" }}>@{otherUser.username}</p>
                <p style={{ color: "#00a884", fontSize: "13px", marginTop: "4px" }}>{otherUser.is_online ? "🟢 Online" : "⚫ Offline"}</p>
              </>
            )}
            {selectedConv.is_group && (
              <div style={{ marginTop: "16px", textAlign: "left" }}>
                <p style={{ color: "#8696a0", fontSize: "13px", marginBottom: "8px" }}>{selectedConv.members.length} members</p>
                {selectedConv.members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid #2a3942" }}>
                    {m.avatar ? <img src={m.avatar} style={{ width: "32px", height: "32px", borderRadius: "50%" }} /> :
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" }}>{m.display_name[0]}</div>}
                    <p style={{ color: "#e9edef", fontSize: "14px" }}>{m.display_name}</p>
                    <div style={{ marginLeft: "auto", width: "8px", height: "8px", borderRadius: "50%", background: m.is_online ? "#00a884" : "#8696a0" }} />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { deleteConversation(selectedConv.id); setShowProfile(false); }}
              style={{ marginTop: "20px", background: "#ff4444", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", cursor: "pointer", width: "100%" }}
            >
              🗑️ Delete Conversation
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <div style={{ width: "380px", borderRight: "1px solid #2a3942", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px", background: "#202c33", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "white", fontWeight: "bold" }}>
              {user?.display_name?.[0] || "U"}
            </div>
            <span style={{ color: "#e9edef", fontWeight: "600" }}>{user?.display_name}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => { setShowNewGroup(true); fetchAllUsers(); }}
              style={{ background: "#2a3942", border: "none", borderRadius: "8px", padding: "6px 12px", color: "#e9edef", fontSize: "13px", cursor: "pointer" }}>
              👥 Group
            </button>
            <button onClick={() => { setShowNewChat(true); fetchAllUsers(); }}
              style={{ background: "#00a884", border: "none", borderRadius: "8px", padding: "6px 12px", color: "white", fontSize: "13px", cursor: "pointer" }}>
              + Chat
            </button>
            <button onClick={() => router.push("/settings")}
              style={{ background: "none", border: "none", color: "#8696a0", cursor: "pointer", fontSize: "18px" }}>⚙️</button>
            <button onClick={logout}
              style={{ background: "none", border: "none", color: "#8696a0", cursor: "pointer", fontSize: "13px" }}>Logout</button>
          </div>
        </div>

        <div style={{ padding: "8px 12px", background: "#111b21" }}>
          <input placeholder="🔍  Search or start new chat" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: "#202c33", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#e9edef", fontSize: "14px", outline: "none" }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map(conv => (
            <div key={conv.id}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer", background: selectedConv?.id === conv.id ? "#2a3942" : "transparent", borderBottom: "1px solid #2a3942", position: "relative" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2a3942")}
              onMouseLeave={e => (e.currentTarget.style.background = selectedConv?.id === conv.id ? "#2a3942" : "transparent")}
            >
              <div onClick={() => selectConversation(conv)} style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div style={{ position: "relative" }}>
                  {getConvAvatar(conv) ? (
                    <img src={getConvAvatar(conv)!} style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
                  ) : (
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: conv.is_group ? "#7b68ee" : "#00a884", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "white" }}>
                      {conv.is_group ? "👥" : getConvName(conv)?.[0]}
                    </div>
                  )}
                  {isOnline(conv) && (
                    <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "12px", height: "12px", background: "#00a884", borderRadius: "50%", border: "2px solid #111b21" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#e9edef", fontWeight: "500", fontSize: "15px" }}>{getConvName(conv)}</span>
                    {conv.last_message && <span style={{ color: "#8696a0", fontSize: "12px" }}>{formatTime(conv.last_message.created_at)}</span>}
                  </div>
                  <p style={{ color: "#8696a0", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "16px", padding: "4px", opacity: 0.7 }}
                title="Delete chat"
              >🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CHAT PANE */}
      {selectedConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            onClick={() => setShowProfile(true)}
            style={{ padding: "12px 20px", background: "#202c33", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #2a3942", cursor: "pointer" }}
          >
            {getConvAvatar(selectedConv) ? (
              <img src={getConvAvatar(selectedConv)!} style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
            ) : (
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: selectedConv.is_group ? "#7b68ee" : "#00a884", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px" }}>
                {selectedConv.is_group ? "👥" : getConvName(selectedConv)?.[0]}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ color: "#e9edef", fontWeight: "600", fontSize: "16px" }}>{getConvName(selectedConv)}</p>
              <p style={{ color: "#00a884", fontSize: "12px" }}>
                {typingUser ? `${getConvName(selectedConv)} is typing...` :
                  selectedConv.is_group ? `${selectedConv.members.length} members` :
                  isOnline(selectedConv) ? "online" : "last seen recently"}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteConversation(selectedConv.id); }}
              style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "18px" }}
              title="Delete chat"
            >🗑️</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#0b141a", display: "flex", flexDirection: "column", gap: "4px" }}>
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              const senderName = selectedConv.is_group ? selectedConv.members.find(m => m.id === msg.sender_id)?.display_name : null;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "65%", padding: "8px 12px", borderRadius: isMe ? "8px 0 8px 8px" : "0 8px 8px 8px", background: isMe ? "#005c4b" : "#202c33", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {!isMe && senderName && (
                      <p style={{ color: "#00a884", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>{senderName}</p>
                    )}
                    <p style={{ color: "#e9edef", fontSize: "14px", lineHeight: "1.4" }}>{msg.content}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", marginTop: "2px" }}>
                      <span style={{ color: "#8696a0", fontSize: "11px" }}>{formatTime(msg.created_at)}</span>
                      {isMe && <span style={{ color: msg.status === "read" ? "#53bdeb" : "#8696a0", fontSize: "12px" }}>{msg.status === "sent" ? "✓" : "✓✓"}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Picker */}
          {showEmoji && (
            <div style={{ background: "#202c33", padding: "12px", borderTop: "1px solid #2a3942", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => setNewMessage(prev => prev + emoji)}
                  style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", padding: "4px", borderRadius: "4px" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#2a3942")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >{emoji}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "12px 16px", background: "#202c33", display: "flex", gap: "12px", alignItems: "center" }}>
            <button onClick={() => setShowEmoji(!showEmoji)}
              style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", padding: "4px" }}>
              😊
            </button>
            <input value={newMessage} onChange={e => handleTyping(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message"
              style={{ flex: 1, background: "#2a3942", border: "none", borderRadius: "8px", padding: "12px 16px", color: "#e9edef", fontSize: "15px", outline: "none" }} />
            <button onClick={sendMessage} style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#00a884", border: "none", cursor: "pointer", fontSize: "20px" }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b141a" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>💬</div>
          <h2 style={{ color: "#e9edef", fontSize: "22px", marginBottom: "8px" }}>Signal Desktop</h2>
          <p style={{ color: "#8696a0", fontSize: "14px" }}>Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}