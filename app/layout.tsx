import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NotificationContainer } from '@/components/ui/Notification';
import { initTheme } from '@/lib/utils/theme';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trello App',
  description: 'A Trello-style task management application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window !== 'undefined') {
    initTheme();
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <NotificationContainer />
      </body>
    </html>
  );
}
