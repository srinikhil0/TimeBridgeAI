import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
