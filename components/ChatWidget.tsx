// components/ChatWidget.tsx
import React, { useState, useRef, useEffect } from "react";

interface Message {
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "bot",
      content:
        "שלום! אני לולי ואני כאן לעזור לך עם שאלות על ספקים, הזמנות ורישיונות. 🐕",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // 🎯 רפרנס לשדה הקלט

  // גלילה אוטומטית לתחתית
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🎯 פוקוס אוטומטי על שדה הקלט
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, loading]); // גם אחרי שהטעינה מסתיימת

  // 🎯 פונקציה להעתקת השיחה
  const copyConversation = () => {
    const conversationText = messages
      .map((msg) => {
        const time = msg.timestamp.toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const speaker = msg.type === "user" ? "👤 אני" : "🐕 לולי";
        return `[${time}] ${speaker}: ${msg.content}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(conversationText).then(() => {
      // הודעה קצרה שההעתקה הצליחה
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "✅ השיחה הועתקה ללוח!",
          timestamp: new Date(),
        },
      ]);

      // הסר את ההודעה אחרי 3 שניות
      setTimeout(() => {
        setMessages((prev) =>
          prev.filter((_, index) => index !== prev.length - 1)
        );
      }, 3000);
    });
  };

  // טיפול בגובה דינמי של textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    // ספירת שורות בפועל
    const lines = textarea.value.split("\n").length;

    if (lines === 1) {
      textarea.style.height = "36px"; // שורה אחת
    } else {
      const newHeight = Math.min(lines * 24 + 12, 120); // 24px לשורה + padding
      textarea.style.height = newHeight + "px";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    adjustTextareaHeight(e.target);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMessage: Message = {
      type: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuestion(""); // 🎯 ניקוי מיידי של השדה

    // 🎯 החזרת הפוקוס לשדה אחרי ניקוי
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight(textareaRef.current); // איפוס גובה עם הפונקציה
      }
    }, 50);

    try {
      const res = await fetch("/api/query-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage.content }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          `HTTP error! status: ${res.status}, message: ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const data = await res.json();
      const botMessage: Message = {
        type: "bot",
        content: data.reply || "לא התקבלה תשובה",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error("Error:", err);
      const errorMessage: Message = {
        type: "bot",
        content: `שגיאה: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // 🎯 פוקוס חוזר אחרי שהטעינה מסתיימת
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        type: "bot",
        content:
          "שלום! אני לולי ואני כאן לעזור לך עם שאלות על ספקים, הזמנות כספים ורישיונות. 🐕",
        timestamp: new Date(),
      },
    ]);
    // 🎯 פוקוס חוזר אחרי ניקוי
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .chat-popup {
          animation: slideUp 0.3s ease-out;
        }
        .message-user {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        }
        .message-bot {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
        }
      `}</style>

      {/* כפתור פתיחה */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 123, 255, 0.3)",
            zIndex: 1000,
            transition: "transform 0.2s ease",
            fontFamily:
              "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          💬
        </button>
      )}

      {/* חלון הצ'אט */}
      {isOpen && (
        <div
          className="chat-popup"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "380px",
            height: "550px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            fontFamily:
              "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          {/* כותרת */}
          <div
            style={{
              background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
              color: "white",
              padding: "12px 16px",
              borderRadius: "12px 12px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            <span>לולי - העוזרת החכמה שלך ({messages.length - 1} שאלות)</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {/* 🎯 כפתור העתקה */}
              <button
                onClick={copyConversation}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily:
                    "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                }}
                title="העתק שיחה"
              >
                📋
              </button>
              <button
                onClick={clearChat}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily:
                    "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                }}
                title="נקה שיחה"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily:
                    "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* אזור הודעות */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    message.type === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {message.type === "bot" && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src="/images/loli_New.jpg"
                      alt="לולי"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems:
                      message.type === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    className={`message-${message.type}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius:
                        message.type === "user"
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                      color: message.type === "user" ? "white" : "#333",
                      fontSize: "14px",
                      lineHeight: "1.4",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    }}
                  >
                    {message.content}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#888",
                      marginTop: "4px",
                      fontFamily:
                        "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                {message.type === "user" && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#6c757d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    👤
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/images/loli_New.jpg"
                    alt="לולי"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "18px 18px 18px 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #007bff",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  <span
                    style={{
                      color: "#007bff",
                      fontSize: "14px",
                      fontFamily:
                        "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    }}
                  >
                    מחפש תשובה...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* טופס שליחה */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "16px",
              borderTop: "1px solid #e9ecef",
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={textareaRef} // 🎯 רפרנס לפוקוס אוטומטי
              value={question}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="מה תרצה לשאול?"
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "20px",
                fontSize: "14px",
                fontFamily:
                  "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                resize: "none",
                outline: "none",
                minHeight: "20px",
                maxHeight: "120px",
                overflowY: "auto",
                transition: "height 0.2s ease",
                lineHeight: "1.4",
              }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: "8px 12px",
                background: loading || !question.trim() ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                fontSize: "14px",
                height: "36px",
                minWidth: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily:
                  "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              }}
            >
              📤
            </button>
          </form>

          {/* הוראות שימוש */}
          <div
            style={{
              padding: "8px 16px",
              background: "#f8f9fa",
              borderTop: "1px solid #e9ecef",
              fontSize: "11px",
              color: "#666",
              textAlign: "center",
              fontFamily:
                "Calibri, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            }}
          >
            Enter לשליחה • Shift+Enter לשורה חדשה
          </div>
        </div>
      )}
    </>
  );
}
