import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { NewContentProvider } from '@/features/new-content/context';
import { StepNav } from '@/features/new-content/components/StepNav';

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
