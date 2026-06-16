import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowCI Demo App',
  description: 'A small example app demonstrating the FlowCI CI/CD pipeline end-to-end.',
};

/* istanbul ignore next -- exercised by Next.js at runtime, not by RTL (see tests/unit/layout.test.tsx) */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
