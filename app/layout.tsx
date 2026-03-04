import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import ConnectionStatus from "@/components/ConnectionStatus";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audience Type | Élève ton niveau",
  description: "Apprends facilement, gagne du temps et progresse vite avec nos cours, ebooks et services faits pour toi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="light" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          .notranslate, [class*="material-symbols"] {
            translate: no !important;
          }
        `}} />
      </head>
      <body
        className={`${inter.className} bg-background-light dark:bg-background-dark text-primary dark:text-white antialiased transition-colors duration-300`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ConnectionStatus />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
