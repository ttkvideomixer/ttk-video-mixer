import AdminGate from '@/components/admin/AdminGate'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export const metadata = { title: 'Painel Admin', robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AdminGate>
      <div className="flex h-screen overflow-hidden bg-bg">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AdminGate>
  )
}
