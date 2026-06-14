import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ordenanza Tarifaria 5487/2025 — Tablero · San Miguel de Tucumán",
  description:
    "Tablero interactivo y asistente de la Ordenanza Tarifaria Municipal N° 5487/2025. Mapa de bloques, buscador, simulador y chatbot con citado de fuentes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Public+Sans:ital,wght@0,300..800;1,400&family=Spline+Sans+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
