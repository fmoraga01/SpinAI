import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Bitcount_Grid_Double } from "next/font/google";
import "./globals.css";
import { DrawerProvider } from "./components/DrawerContext";
import Drawer from "./components/Drawer";
import PinGate from "./components/PinGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const bitcountGridDouble = Bitcount_Grid_Double({
  variable: "--font-retro",
  subsets: ["latin"],
  weight: ["700"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "SpinAI · Asignador de reuniones",
  description: "Asigna aleatoriamente quién lidera la reunión de equipo cada viernes",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} ${bitcountGridDouble.variable} h-full`}>
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
