import { AuthGuard } from '@/components/auth/AuthGuard';
import { NewContentProvider } from '@/components/new/NewContentContext';
import { StepNav } from '@/components/new/StepNav';

export default function NewLayout(props: LayoutProps<'/new'>) {
  return (
    <AuthGuard>
      <NewContentProvider>
        <div className="min-h-screen flex flex-col bg-bg">
          <StepNav />
          <main className="flex-1 flex flex-col">{props.children}</main>
        </div>
      </NewContentProvider>
    </AuthGuard>
  );
}
