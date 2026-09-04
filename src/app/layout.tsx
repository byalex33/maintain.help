import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { SignInToast } from "@/components/auth/sign-in-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "maintain.help — Find open source that needs you",
    template: "%s | maintain.help",
  },
  description:
    "Discover open-source projects looking for contributors, reviewers, maintainers, documentation help, and more — with the evidence behind every conclusion.",
  metadataBase: new URL("https://maintain.help"),
  openGraph: {
    title: "maintain.help — Find open source that needs you",
    description:
      "Discover open-source projects looking for contributors, reviewers, maintainers, documentation help, and more.",
    type: "website",
    siteName: "maintain.help",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={{ elements: { footer: { display: "none" } } }} signInUrl="/sign-in" signUpUrl="/sign-in" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <SignInToast />
        </ClerkProvider>
      </body>
    </html>
  );
}
