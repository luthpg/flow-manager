import type React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <Toaster theme={theme} />
    </>
  );
}
