"use client";

import { useState, useRef, useEffect } from "react";

export default function AIPage() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "¡Hola! Soy tu asistente de gestión. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [lastModel, setLastModel] = useState(null);
  const messagesEndRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isCancellingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (isCancellingRef.current) {
          isCancellingRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result.split(",")[1];
          sendAudioMessage(base64Audio, "audio/webm");
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono. Verificá los permisos del navegador.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      isCancellingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && isRecording) {
      isCancellingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function sendAudioMessage(base64Audio, mimeType) {
    setMessages(prev => [...prev, { role: "user", text: "🎙️ [Mensaje de voz]" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData: base64Audio, mimeType }),
      });
      const data = await res.json();
      
      if (data.text) {
        setMessages(prev => [...prev, { role: "ai", text: data.text, model: data.model }]);
        setQueryCount(prev => prev + 1);
        if (data.model) setLastModel(data.model);
        
        if (data.text.includes("Acción ejecutada")) {
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.error || "Perdón, tuve un problema al procesar el audio." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading || isRecording) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      
      if (data.text) {
        setMessages(prev => [...prev, { role: "ai", text: data.text, model: data.model }]);
        setQueryCount(prev => prev + 1);
        if (data.model) setLastModel(data.model);
        
        if (data.text.includes("Acción ejecutada")) {
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        const errorMsg = data.error || "Perdón, tuve un problema al procesar tu consulta. Verifica que la GEMINI_API_KEY esté configurada.";
        setMessages(prev => [...prev, { role: "ai", text: errorMsg }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "Error de conexión con el asistente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", maxWidth: 1000, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1>Asistente Inteligente</h1>
          <p className="page-header-sub">Consultas en lenguaje natural sobre toda tu base de datos.</p>
        </div>
        {lastModel && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              background: "rgba(173,198,255,0.1)", 
              border: "1px solid rgba(173,198,255,0.2)",
              borderRadius: 10, 
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--primary)" }}>smart_toy</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--on-surface)" }}>{lastModel}</span>
            </div>
            <div style={{ 
              background: "rgba(78,222,163,0.1)", 
              border: "1px solid rgba(78,222,163,0.2)",
              borderRadius: 10, 
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--secondary)" }}>query_stats</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--on-surface)" }}>{queryCount} consulta{queryCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}
      </div>

      <div className="data-table-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 0, background: "rgba(30,41,59,0.5)" }}>
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`} style={{ 
              maxWidth: "70%", 
              fontSize: 16, 
              padding: "16px 20px",
              boxShadow: msg.role === 'ai' ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(173,198,255,0.2)'
            }}>
              {msg.text}
              {msg.model && (
                <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                  vía {msg.model}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai" style={{ padding: "12px 20px" }}>
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={{ 
          padding: 24, 
          background: "rgba(255,255,255,0.02)", 
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          gap: 16,
          alignItems: "center"
        }}>
          {isRecording ? (
            <div style={{ flex: 1, height: 48, display: "flex", alignItems: "center", padding: "0 16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, color: "var(--error)" }}>
              <div className="typing-dot" style={{ background: "var(--error)", animationDuration: "1s" }}></div>
              <span style={{ marginLeft: 12, fontWeight: 500 }}>Grabando audio...</span>
            </div>
          ) : (
            <input 
              type="text" 
              className="form-input" 
              style={{ flex: 1, height: 48, fontSize: 16, background: "rgba(255,255,255,0.05)" }}
              placeholder="Escribe tu consulta aquí... (ej: ¿Quién está en la oficina hoy?)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
          )}

          {isRecording ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={cancelRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 48, height: 48, minWidth: 48, color: "var(--on-surface-variant)", borderColor: "var(--outline)", borderRadius: "50%" }} title="Cancelar">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>delete</span>
              </button>
              <button type="button" onClick={stopRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 48, height: 48, minWidth: 48, color: "var(--error)", borderColor: "var(--error)", borderRadius: "50%" }} title="Enviar audio">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>send</span>
              </button>
            </div>
          ) : (
            <button type="button" onClick={startRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 48, height: 48, minWidth: 48, borderRadius: "50%", border: "none", background: "transparent" }} title="Grabar audio" disabled={loading}>
              <span className="material-symbols-outlined" style={{ color: "var(--outline)", fontSize: 24 }}>mic</span>
            </button>
          )}

          {!isRecording && (
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", height: 48 }} disabled={loading}>
              <span className="material-symbols-outlined" style={{ marginRight: 8 }}>send</span>
              Enviar
            </button>
          )}
        </form>
      </div>
      
      <div style={{ padding: "12px 0", textAlign: "center", color: "var(--outline)", fontSize: 12 }}>
        Potenciado por Google Gemini · Auto-fallback entre modelos
      </div>
    </div>
  );
}
