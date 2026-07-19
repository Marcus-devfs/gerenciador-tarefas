import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { getUserSettingsCollection } from "@/lib/mongodb";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user?.isAdmin ?? false;
  const email = session.user?.email?.toLowerCase() ?? "";

  let isManager = false;
  if (email) {
    const settingsCol = await getUserSettingsCollection();
    const count = await settingsCol.countDocuments({
      managerEmail: email,
      email: { $ne: email },
    });
    isManager = count > 0;
  }

  return (
    <div className="h-screen flex flex-col bg-surface-50">
      <Header
        userName={session.user?.name}
        userEmail={session.user?.email}
        isAdmin={isAdmin}
        isManager={isManager}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
