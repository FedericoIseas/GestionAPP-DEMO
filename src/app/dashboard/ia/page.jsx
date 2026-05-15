"use client";

import { useState, useRef, useEffect } from "react";

export default function IAPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "¡Hola! Soy la inteligencia artificial del Team Manager. Podés preguntarme cualquier cosa sobre el equipo, tareas, ausencias o equipamiento. ¿En qué te puedo ayudar hoy?" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
    <div style={{ height: "calc(100vh - 48px)", display: "flex", flexDirection: "column", padding: "0 24px 24px 24px" }}>
      <div className="page-header">
        <div>
          <h1>Asistente Inteligente</h1>
          <p className="page-header-sub">Consultas en lenguaje natural sobre la base de datos</p>
        </div>
      </div>

      <div className="data-table-wrapper" style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        background: "rgba(30,41,59,0.7)", 
        padding: 0, 
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)"
      }}>
        {/* Messages area */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "24px", 
          display: "flex", 
          flexDirection: "column", 
          gap: 20 
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.role === "user" ? "var(--primary)" : "rgba(255,255,255,0.05)",
              color: m.role === "user" ? "var(--on-primary)" : "var(--on-surface)",
              padding: "14px 18px", 
              borderRadius: 20,
              borderBottomRightRadius: m.role === "user" ? 4 : 20,
              borderBottomLeftRadius: m.role === "ai" ? 4 : 20,
              fontSize: 15, 
              lineHeight: 1.6,
              boxShadow: m.role === "user" ? "0 4px 12px rgba(173,198,255,0.2)" : "none",
              whiteSpace: "pre-wrap"
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ 
              alignSelf: "flex-start", 
              padding: "14px 18px", 
              background: "rgba(255,255,255,0.03)", 
              borderRadius: 20, 
              fontSize: 14, 
              color: "var(--on-surface-variant)",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <div className="loading-spinner-sm" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--secondary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Consultando a Gemini 1.5 Flash...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ 
          padding: "24px", 
          background: "rgba(0,0,0,0.2)", 
          borderTop: "1px solid rgba(255,255,255,0.05)" 
        }}>
          <form onSubmit={handleSend} style={{ display: "flex", gap: 12, maxWidth: "900px", margin: "0 auto", position: "relative" }}>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ej: ¿Quiénes están ausentes hoy? ¿Qué notebooks están disponibles?"
              disabled={loading}
              style={{
                flex: 1, 
                padding: "16px 24px", 
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)", 
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--on-surface)", 
                outline: "none", 
                fontSize: 16,
                transition: "all 0.2s"
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
              onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
            <button 
              type="submit" 
              disabled={loading || !prompt.trim()}
              className="btn-primary"
              style={{
                borderRadius: 16,
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <span className="material-symbols-outlined" style={{ marginRight: 8 }}>send</span>
              Enviar
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--outline)", marginTop: 12 }}>
            La IA puede cometer errores. Verificá siempre la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
