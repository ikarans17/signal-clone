"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [user] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("user") || "{}");
    }
    return {};
  });

  const sections = [
    { icon: "👤", title: "Profile", desc: "Name, phone, about, avatar" },
    { icon: "🔒", title: "Privacy", desc: "Last seen, read receipts, blocked contacts" },
    { icon: "🔔", title: "Notifications", desc: "Message, group & call tones" },
    { icon: "💬", title: "Chats", desc: "Theme, wallpaper, chat history" },
    { icon: "📱", title: "Linked Devices", desc: "Coming Soon" },
    { icon: "🔑", title: "Account", desc: "Security, change number, delete account" },
    { icon: "❓", title: "Help", desc: "FAQ, contact us, privacy policy" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111b21" }}>
      {/* Sidebar */}
      <div style={{ width: "380px", borderRight: "1px solid #2a3942", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px", background: "#202c33", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/chat")} style={{ background: "none", border: "none", color: "#00a884", fontSize: "20px", cursor: "pointer" }}>←</button>
          <h2 style={{ color: "#e9edef", fontSize: "18px" }}>Settings</h2>
        </div>

        {/* Profile Card */}
        <div style={{ padding: "20px 16px", background: "#202c33", marginBottom: "8px", display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid #2a3942" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", color: "white", fontWeight: "bold" }}>
            {user?.display_name?.[0] || "U"}
          </div>
          <div>
            <p style={{ color: "#e9edef", fontSize: "18px", fontWeight: "600" }}>{user?.display_name}</p>
            <p style={{ color: "#8696a0", fontSize: "14px" }}>@{user?.username}</p>
            <p style={{ color: "#8696a0", fontSize: "13px" }}>{user?.phone_number}</p>
          </div>
        </div>

        {/* Settings List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sections.map((s, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderBottom: "1px solid #2a3942", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2a3942")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "24px" }}>{s.icon}</span>
              <div>
                <p style={{ color: "#e9edef", fontSize: "15px" }}>{s.title}</p>
                <p style={{ color: "#8696a0", fontSize: "13px" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b141a", flexDirection: "column", gap: "16px" }}>
        <span style={{ fontSize: "64px" }}>⚙️</span>
        <h2 style={{ color: "#e9edef", fontSize: "22px" }}>Settings</h2>
        <p style={{ color: "#8696a0", fontSize: "14px" }}>Select a setting to configure</p>
      </div>
    </div>
  );
}