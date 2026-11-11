import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { MobileHeader } from './mobile-header';
import { Navigation } from './navigation';
import { useRoutePrefetch } from './use-route-prefetch';
import { CoproducerDock, CoproducerProvider } from '@/features/coproducer';
import { ScrollProgress } from './scroll-progress';
import './navigation.css';

export function AppShell({ children }: { children: ReactNode }) {
  useRoutePrefetch();
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const isAuthForm = location === '/login' || location === '/register';
  const isDiscovery = location === '/discovery';
  const showNav = !isLoading && !isAuthForm && (isAuthenticated || location !== '/');
  function toggle() { setExpanded(value => !value); }
  return <CoproducerProvider><div className={`app-shell bg-bg ${isDiscovery ? 'discovery-shell h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'}`} data-navigation={showNav} data-expanded={expanded}>
    <ScrollProgress />
    {showNav && <Navigation expanded={expanded} onToggle={toggle} />}
    <div className={`shell-content relative flex min-w-0 flex-col ${isDiscovery ? 'h-full min-h-0' : 'min-h-[100dvh]'}`}>
      {showNav && <MobileHeader />}
      <div className={`shell-page relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${isDiscovery ? 'overflow-y-hidden' : ''}`}>
        {children}
      </div>
    </div>
    {showNav && isAuthenticated && <CoproducerDock />}
  </div></CoproducerProvider>;
}

export function ContentWidth({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
