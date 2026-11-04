import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { ClientLayout } from '../components/ClientLayout';

export const metadata: Metadata = {
  title: 'Academia y Colegio WHITMAN | Garra y Excelencia',
  description: 'Plataforma oficial de control de asistencia en tiempo real, registro de notas y gestión académica.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className="bg-[#fbf9fa] text-slate-900 antialiased selection:bg-[#800020] selection:text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
