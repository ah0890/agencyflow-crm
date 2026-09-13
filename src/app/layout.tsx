import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { PREFERENCES_COOKIE, parsePreferences } from "@/lib/preferences";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgencyFlow CRM",
    template: "%s | AgencyFlow CRM",
  },
  description:
    "A modern CRM for digital agencies: leads, clients, projects, tasks, follow-ups and pipeline in one dashboard.",
};

export const viewport: Viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
};

/**
 * Reads the preferences cookie on the server and stamps the theme attributes
 * into the initial HTML, so the page arrives already in the right theme -
 * no flash, and no blocking inline script.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const preferences = parsePreferences(
    cookieStore.get(PREFERENCES_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      data-theme={preferences.theme}
      data-accent={preferences.accent}
      data-density={preferences.density}
    >
      <body className={`${inter.variable} antialiased`}>
        <PreferencesProvider initial={preferences}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
              },
            }}
          />
        </PreferencesProvider>
      </body>
    </html>
  );
}
