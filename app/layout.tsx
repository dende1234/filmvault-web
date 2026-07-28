import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getLocale, getThemePreference } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FilmVault",
  description: "Houd je fysieke filmcollectie bij",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, locale] = await Promise.all([getThemePreference(), getLocale()]);
  const dict = getDictionary(locale);
  // "system" leaves no class on <html> — globals.css falls back to the
  // prefers-color-scheme media query in that case, same tri-state as
  // Android's FilmVaultTheme(darkTheme = isSystemInDarkTheme()).
  const themeClass = theme === "system" ? "" : theme;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${themeClass} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider dict={dict} locale={locale}>
          {children}
          <Toaster richColors position="top-center" />
        </LocaleProvider>
      </body>
    </html>
  );
}
