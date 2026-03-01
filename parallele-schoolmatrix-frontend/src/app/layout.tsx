import type { Metadata } from "next";
import { SchoolProfileProvider } from "@/src/contexts/SchoolProfileContext";
import { AppShell } from "@/src/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parallele SchoolMatrix",
  description: "Gestion scolaire Parallele SchoolMatrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <SchoolProfileProvider>
          <AppShell>{children}</AppShell>
        </SchoolProfileProvider>
      </body>
    </html>
  );
}
