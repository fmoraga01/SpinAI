import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DrawerProvider } from "./components/DrawerContext";
import Drawer from "./components/Drawer";
import PinGate from "./components/PinGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SpinAI · Asignador de reuniones",
  description: "Asigna aleatoriamente quién lidera la reunión de equipo cada viernes",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <PinGate>
          <DrawerProvider>
            {children}
            <Drawer />
          </DrawerProvider>
        </PinGate>
      </body>
    </html>
  );
}
