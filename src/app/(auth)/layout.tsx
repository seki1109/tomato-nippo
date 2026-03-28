export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header・Navigationは Issue #27 で実装予定 */}
      <main>{children}</main>
    </div>
  );
}
