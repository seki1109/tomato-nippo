import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">アクセス拒否</h1>
          <p className="text-muted-foreground">
            このページにアクセスする権限がありません。
          </p>
        </div>
        <Button asChild>
          <Link href="/reports">ホームに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
