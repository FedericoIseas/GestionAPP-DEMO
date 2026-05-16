import ReportesClient from "./ReportesClient";

export const metadata = { title: "Reportes" };

export default function ReportesPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reportes y Exportación</h1>
          <p className="page-header-sub">Descargá la información en formato Excel</p>
        </div>
      </div>
      <ReportesClient />
    </>
  );
}
