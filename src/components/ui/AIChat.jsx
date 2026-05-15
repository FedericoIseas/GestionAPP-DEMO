"use client";

import { useState, useRef, useEffect } from "react";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "¡Hola! Soy la inteligencia artificial del Team Manager. Podés preguntarme cualquier cosa sobre el equipo, tareas, ausencias o equipamiento." }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage })
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "ai", text: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "No me pude conectar con el servidor. Revisá tu conexión." }]);
    }

    setLoading(false);
  }

  return (
    <>
      {/* Botón Flotante */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 40,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #adc6ff 0%, #4edea3 100%)",
          color: "#002e6a", border: "none",
          boxShadow: "0 8px 24px rgba(78,222,163,0.3)",
          display: isOpen ? "none" : "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "transform 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>smart_toy</span>
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 50,
          width: "360px", height: "500px", maxWidth: "calc(100vw - 48px)",
          background: "var(--surface-container-high)",
          borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          animation: "scale-in 0.2s ease-out",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ 
            padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "var(--surface-container-highest)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--secondary)", fontSize: 22 }}>smart_toy</span>
              <span style={{ fontWeight: 600, color: "var(--on-surface)" }}>Team AI</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--on-surface-variant)", cursor: "pointer", display: "flex" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "var(--primary)" : "rgba(255,255,255,0.05)",
                color: m.role === "user" ? "var(--on-primary)" : "var(--on-surface)",
                padding: "10px 14px", borderRadius: 16,
                borderBottomRightRadius: m.role === "user" ? 4 : 16,
                borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
                fontSize: 14, lineHeight: 1.5
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 16, fontSize: 14, color: "var(--on-surface-variant)" }}>
                Analizando base de datos...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, background: "var(--surface-container-highest)" }}>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Preguntame algo..."
              disabled={loading}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 999,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--on-surface)", outline: "none", fontSize: 14
              }}
            />
            <button 
              type="submit" 
              disabled={loading || !prompt.trim()}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "var(--primary)", color: "var(--on-primary)",
                border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: (loading || !prompt.trim()) ? "not-allowed" : "pointer",
                opacity: (loading || !prompt.trim()) ? 0.5 : 1
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
