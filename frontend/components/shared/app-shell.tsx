import { AppSidebar } from "./sidebar";
import { PageTitle } from "./page-title";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden">
      <SidebarProvider className="relative h-svh">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1 [&>svg]:size-4" />
            <Separator
              className="mr-1 h-4 data-[orientation=vertical]:self-center"
              orientation="vertical"
            />
            <PageTitle />
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
