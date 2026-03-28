export interface Customer {
  customer_id: number;
  company_name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
