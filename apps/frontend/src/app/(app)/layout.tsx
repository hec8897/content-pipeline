import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AppLayout(props: LayoutProps<'/'>) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
          <MobileTopBar />
          <main className="flex-1 min-w-0">{props.children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </AuthGuard>
  );
}
