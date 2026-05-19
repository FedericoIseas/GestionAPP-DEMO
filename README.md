# GestionApp - FD — Asistente Inteligente de Gestión

Una plataforma moderna, rápida y estéticamente premium para la gestión integral de equipos de trabajo, inventario y tareas, potenciada por Inteligencia Artificial.

## 🚀 Características Principales

- **Dashboard "Resumen":** Vista inmediata del estado del equipo (quién está en la oficina, quién en remoto, ausencias y tareas críticas).
- **Gestión de Personal:** Listado jerárquico de miembros (Director, Coordinación, Técnicos, Expedientes, OR, Analista Legal) con ordenamiento automático.
- **Asistente IA (Gemini Pro):** Chat inteligente que responde consultas sobre la base de datos en lenguaje natural (ej: "¿Quiénes están ausentes hoy?", "¿Qué tareas vencen esta semana?").
- **Matriz de Home Office:** Grilla interactiva global para configurar los días presenciales y remotos de todo el personal de un vistazo.
- **Control de Ausencias:** Seguimiento de vacaciones, licencias y otros motivos con impacto directo en el dashboard diario.
- **Inventario de Equipamiento:** Registro y asignación de hardware (notebooks, periféricos) vinculado a los miembros del equipo.
- **PWA (Progressive Web App):** Instalable en PC y móviles, con ícono personalizado y experiencia de aplicación nativa.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **IA:** Google Gemini API (v1beta / gemini-pro)
- **Estilos:** Vanilla CSS con un sistema de diseño "Premium Dark" y animaciones fluidas.
- **PWA:** @serwist/next

## ⚙️ Configuración

1. Clonar el repositorio.
2. Instalar dependencias: `npm install`.
3. Configurar las siguientes variables en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   ADMIN_USER_UUID=tu_uuid_de_usuario_admin
   GEMINI_API_KEY=tu_clave_de_gemini_ai
   ```
4. Ejecutar el servidor de desarrollo: `npm run dev`.

---
Desarrollado con foco en la eficiencia operativa y la experiencia de usuario moderna.
