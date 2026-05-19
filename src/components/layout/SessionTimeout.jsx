"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hora en milisegundos

export default function SessionTimeout() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Función para cerrar sesión por inactividad
    async function logout() {
      console.log("🔒 [SessionTimeout] Cerrando sesión por inactividad...");
      localStorage.removeItem("lastActivity");
      await supabase.auth.signOut();
      router.push("/auth/login?reason=idle");
    }

    // 1. Chequeo pasivo al cargar la página
    const lastActivity = localStorage.getItem("lastActivity");
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > TIMEOUT_MS) {
        logout();
        return;
      }
    }

    // Registrar la actividad inicial
    localStorage.setItem("lastActivity", Date.now().toString());

    // 2. Temporizador activo y detector de eventos
    let timeoutId;

    function resetTimer() {
      // Guardamos la última actividad en localStorage
      localStorage.setItem("lastActivity", Date.now().toString());
      
      // Limpiamos el temporizador previo
      if (timeoutId) clearTimeout(timeoutId);
      
      // Programamos el cierre tras 1 hora
      timeoutId = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    }

    // Lista de eventos que demuestran interacción del usuario
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    
    // Función optimizada para registrar eventos (debounced para no sobrecargar localStorage)
    let lastUpdate = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Solo actualizamos localStorage si pasaron más de 5 segundos para optimizar rendimiento
      if (now - lastUpdate > 5000) {
        localStorage.setItem("lastActivity", now.toString());
        lastUpdate = now;
      }
      resetTimer();
    };

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Iniciar temporizador al montar
    resetTimer();

    // Limpieza
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [router, supabase.auth]);

  return null;
}
