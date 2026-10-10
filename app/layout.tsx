import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getLocale, getThemePreference } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for film titles and page headings — the "film poster /
// Criterion catalogue" voice next to Geist's neutral UI text.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: jouw fysieke filmcollectie, eindelijk overzichtelijk`, template: `%s · ${SITE_NAME}` },
  description:
    "Houd je dvd's, Blu-rays en 4K UHD's op één plek bij. Organiseer je collectie en verlanglijst, deel je mooiste edities en ontdek andere verzamelaars.",
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: "Jouw fysieke filmcollectie. Eindelijk overzichtelijk.",
    siteName: SITE_NAME,
    locale: "nl_NL",
    type: "website",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, locale] = await Promise.all([getThemePreference(), getLocale()]);
  const dict = getDictionary(locale);
  // "system" leaves no class on <html> — globals.css falls back to the
  // prefers-color-scheme media query in that case (dark unless the OS asks
  // for light), same tri-state as Android's FilmVaultTheme.
  const themeClass = theme === "system" ? "" : theme;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${themeClass} h-full antialiased`}
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
