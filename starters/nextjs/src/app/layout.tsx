import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowCI Studio App',
  description: 'Next.js app created by FlowCI Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
