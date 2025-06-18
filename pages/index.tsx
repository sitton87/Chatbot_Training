import React from "react";
import ChatWidget from "../components/ChatWidget";

export default function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>🎉 צ'אט AI פנימי</h1>
      <p>ברוך הבא למערכת הצ'אט שלך.</p>
      <ChatWidget />
    </div>
  );
}
