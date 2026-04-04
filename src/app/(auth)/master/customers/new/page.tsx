"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const PHONE_REGEX = /^[\d\-\+\(\)\s]+$/;

interface FormErrors {
  company_name?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
}

function NewCustomerPageContent() {
  const router = useRouter();
  const { token } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!companyName.trim()) {
      newErrors.company_name = "会社名は必須です";
    } else if (companyName.length > 200) {
      newErrors.company_name = "会社名は200文字以内で入力してください";
    }

    if (contactPerson.length > 100) {
      newErrors.contact_person = "担当者名は100文字以内で入力してください";
    }

    if (phone.length > 0 && !PHONE_REGEX.test(phone)) {
      newErrors.phone = "電話番号の形式が正しくありません";
    }

    if (address.length > 500) {
      newErrors.address = "住所は500文字以内で入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          contact_person: contactPerson || undefined,
          phone: phone || undefined,
          address: address || undefined,
        }),
      });

      if (res.ok) {
        router.push("/master/customers");
      } else {
        const json = (await res.json()) as { error: { message: string } };
        setApiError(json.error?.message ?? "保存に失敗しました。");
      }
    } catch {
      setApiError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">顧客登録</h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        className="max-w-lg space-y-4"
      >
        <div className="space-y-1">
          <label htmlFor="company_name" className="text-sm font-medium">
            会社名 <span className="text-destructive">*</span>
          </label>
          <Input
            id="company_name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
          />
          {errors.company_name && (
            <p className="text-sm text-destructive">{errors.company_name}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="contact_person" className="text-sm font-medium">
            担当者名
          </label>
          <Input
            id="contact_person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            disabled={submitting}
          />
          {errors.contact_person && (
            <p className="text-sm text-destructive">{errors.contact_person}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className="text-sm font-medium">
            電話番号
          </label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-medium">
            住所
          </label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            disabled={submitting}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address}</p>
          )}
        </div>

        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/master/customers")}
            disabled={submitting}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewCustomerPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <NewCustomerPageContent />
    </AuthGuard>
  );
}
