import "@/app/globals.css";

export const metadata = {
  title: {
    default: "GestionApp FD",
    template: "%s · GestionApp FD",
  },
  description: "GestionApp FD — panel de administración privado",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GestionApp - FD",
  },
};

export const viewport = {
  themeColor: "#0b1326",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ backgroundColor: "#0b1326", color: "#dae2fd" }}>
        {children}
      </body>
    </html>
  );
}
