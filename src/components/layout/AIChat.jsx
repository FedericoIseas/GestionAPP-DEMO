"use client";

import { useState, useRef, useEffect } from "react";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "¡Hola! Soy tu asistente inteligente. Pregúntame lo que necesites sobre el equipo, las tareas o el inventario." }
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

  useEffect(() => {
    const handleMobileMenuOpen = () => {
      setIsOpen(false);
    };
    window.addEventListener("mobile-menu-open", handleMobileMenuOpen);

    /*// Monitoreo de permisos de micrófono para debugging
    if (typeof window !== "undefined" && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "microphone" })
        .then(permissionStatus => {
          console.log("🎤 [GestionApp - FD] Estado del permiso de micrófono:", permissionStatus.state);
          permissionStatus.onchange = () => {
            console.log("🎤 [GestionApp - FD] El estado del permiso cambió a:", permissionStatus.state);
          };
        })
        .catch(err => {
          console.warn("⚠️ [GestionApp - FD] La API de permisos no soporta 'microphone' en este navegador:", err);
        });
    }*/

    return () => {
      window.removeEventListener("mobile-menu-open", handleMobileMenuOpen);
    };
  }, []);

  const handleToggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      window.dispatchEvent(new CustomEvent("ai-chat-open"));
    }
  };

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
      console.error("Error al acceder al micrófono:", err);
      if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        alert("El acceso al micrófono requiere una conexión segura (HTTPS). Si estás probando en red local, asegurate de usar 'localhost' en tu navegador en lugar de la dirección IP.");
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Permiso denegado. Habilitá el acceso al micrófono en la configuración de tu navegador para este sitio.");
      } else {
        alert(`No se pudo acceder al micrófono: [${err.name}] ${err.message || err}`);
      }
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
        const errorMsg = data.error || "Perdón, tuve un problema al procesar tu consulta.";
        setMessages(prev => [...prev, { role: "ai", text: errorMsg }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "Error de conexión con el asistente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-chat-float">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>auto_awesome</span>
              <div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Asistente IA</span>
                {lastModel && (
                  <div style={{ fontSize: 10, color: "var(--outline)", fontFamily: "var(--font-mono)" }}>
                    {lastModel} · {queryCount} consulta{queryCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "var(--outline)", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.text}
                {msg.model && (
                  <div style={{ fontSize: 10, color: "var(--outline)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                    vía {msg.model}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg ai">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input-area" onSubmit={handleSubmit} style={{ alignItems: "center", display: "flex", gap: 8 }}>
            {isRecording ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 8px", color: "var(--error)" }}>
                <div className="typing-dot" style={{ background: "var(--error)", animationDuration: "1s" }}></div>
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500 }}>Grabando...</span>
              </div>
            ) : (
              <input
                type="text"
                className="ai-chat-input"
                placeholder="Pregunta algo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
            )}

            {isRecording ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={cancelRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 36, height: 36, minWidth: 36, color: "var(--on-surface-variant)", borderColor: "var(--outline)", borderRadius: "50%" }} title="Cancelar">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                </button>
                <button type="button" onClick={stopRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 36, height: 36, minWidth: 36, color: "var(--error)", borderColor: "var(--error)", borderRadius: "50%" }} title="Enviar audio">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </div>
            ) : (
              <button type="button" onClick={startRecording} className="btn-secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: 36, height: 36, minWidth: 36, borderRadius: "50%", border: "none", background: "transparent" }} disabled={loading} title="Grabar audio">
                <span className="material-symbols-outlined" style={{ color: "var(--outline)" }}>mic</span>
              </button>
            )}

            {!isRecording && (
              <button
                type="submit"
                className="btn-primary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, padding: 0, borderRadius: 10, flexShrink: 0 }}
                disabled={loading}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            )}
          </form>
        </div>
      )}

      <button
        className="ai-chat-btn"
        onClick={handleToggleChat}
        title="Asistente Inteligente"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          {isOpen ? "close" : "auto_awesome"}
        </span>
      </button>
    </div>
  );
}
