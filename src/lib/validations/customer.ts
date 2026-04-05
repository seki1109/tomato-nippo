export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateCustomerCreate(
  body: Record<string, unknown>,
): ValidationResult {
  const { company_name, contact_person, phone, address } = body;
  const errors: ValidationError[] = [];

  // company_name: 必須・200文字以内
  if (
    company_name === undefined ||
    company_name === null ||
    company_name === ""
  ) {
    errors.push({ field: "company_name", message: "会社名は必須です" });
  } else if (typeof company_name !== "string") {
    errors.push({
      field: "company_name",
      message: "会社名の形式が正しくありません",
    });
  } else if (company_name.length > 200) {
    errors.push({
      field: "company_name",
      message: "会社名は200文字以内で入力してください",
    });
  }

  // contact_person: 任意・100文字以内
  if (typeof contact_person === "string" && contact_person.length > 100) {
    errors.push({
      field: "contact_person",
      message: "担当者名は100文字以内で入力してください",
    });
  }

  // phone: 任意・電話番号形式
  if (
    typeof phone === "string" &&
    phone.length > 0 &&
    !/^[\d\-\+\(\)\s]+$/.test(phone)
  ) {
    errors.push({
      field: "phone",
      message: "電話番号の形式が正しくありません",
    });
  }

  // address: 任意・500文字以内
  if (typeof address === "string" && address.length > 500) {
    errors.push({
      field: "address",
      message: "住所は500文字以内で入力してください",
    });
  }

  return { valid: errors.length === 0, errors };
}
