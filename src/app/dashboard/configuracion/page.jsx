import ConfiguracionClient from "./ConfiguracionClient";

export const metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p className="page-header-sub">Estado del sistema y conexiones</p>
        </div>
      </div>
      <ConfiguracionClient />
    </>
  );
}
