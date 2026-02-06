
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Routes that should NOT have a sidebar or its margin
  const isAuthPage = pathname === '/login' || pathname === '/onboarding';
  
  // Only show sidebar if we're not on an auth page AND we have a user
  const showSidebar = !isAuthPage && user;

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row bg-background">
      {showSidebar && <Navbar />}
      <main
        className={cn(
          "flex-1 w-full min-h-screen transition-all duration-300 flex",
          showSidebar ? "md:ml-64 pb-24 md:pb-0" : "items-center justify-center"
        )}
      >
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
