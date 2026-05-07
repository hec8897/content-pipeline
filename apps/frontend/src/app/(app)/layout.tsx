import { Sidebar } from "@/components/shell/Sidebar";
import { MobileBottomNav } from "@/components/shell/MobileBottomNav";
import { MobileTopBar } from "@/components/shell/MobileTopBar";

export default function AppLayout(props: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        <MobileTopBar />
        <main className="flex-1 min-w-0">{props.children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
