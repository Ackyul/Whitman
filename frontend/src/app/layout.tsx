import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from '../components/ClientLayout';

export const metadata: Metadata = {
  title: 'Academia y Colegio WHITMAN | Garra y Excelencia',
  description: 'Plataforma oficial de control de asistencia en tiempo real, registro de notas y gestión académica.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[#fbf9fa] text-slate-900 antialiased selection:bg-[#800020] selection:text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
