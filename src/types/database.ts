export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; avatar_url: string | null; role: "admin" | "staff" | "customer"; phone: string | null; email: string | null; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; slug: string; parent_id: string | null; image_url: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      brands: {
        Row: { id: string; name: string; slug: string; logo_url: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["brands"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["brands"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: { id: string; title: string; slug: string; description: string | null; specifications: Json; attributes: Json; tags: string[]; category_id: string | null; brand_id: string | null; price: number; compare_at_price: number | null; currency: string; stock_quantity: number; sku: string | null; status: "draft" | "pending_review" | "published" | "archived"; source: "manual" | "ai_import"; ai_confidence: number | null; created_by: string | null; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & { title: string; slug: string; price: number };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      product_images: {
        Row: { id: string; product_id: string; url: string; alt_text: string | null; position: number; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["product_images"]["Row"]> & { product_id: string; url: string };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Row"]>;
        Relationships: [];
      };
      pages: {
        Row: { id: string; title: string; slug: string; blocks: Json; status: "draft" | "published"; seo_title: string | null; seo_description: string | null; created_by: string | null; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["pages"]["Row"]> & { title: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["pages"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: { id: string; customer_id: string | null; status: "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded"; payment_method: "cod" | "sslcommerz" | "bkash" | "nagad" | "rocket"; payment_status: "unpaid" | "paid" | "refunded"; total: number; shipping_address: Json; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & { total: number; shipping_address: Json };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; unit_price: number };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & { order_id: string; product_id: string; quantity: number; unit_price: number };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [];
      };
      ai_import_drafts: {
        Row: { id: string; source_image_url: string; extracted: Json; confidence: number | null; status: "pending_review" | "approved" | "rejected"; reviewed_by: string | null; resulting_product_id: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["ai_import_drafts"]["Row"]> & { source_image_url: string; extracted: Json };
        Update: Partial<Database["public"]["Tables"]["ai_import_drafts"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; ip_address: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & { action: string; entity_type: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
      banners: {
        Row: { id: string; title: string; image_url: string; link_url: string | null; position: number; active: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["banners"]["Row"]> & { title: string; image_url: string };
        Update: Partial<Database["public"]["Tables"]["banners"]["Row"]>;
        Relationships: [];
      };
      coupons: {
        Row: { id: string; code: string; type: "percentage" | "fixed"; value: number; min_order_amount: number | null; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["coupons"]["Row"]> & { code: string; type: "percentage" | "fixed"; value: number };
        Update: Partial<Database["public"]["Tables"]["coupons"]["Row"]>;
        Relationships: [];
      };
      wishlist: {
        Row: { id: string; user_id: string; product_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["wishlist"]["Row"]> & { user_id: string; product_id: string };
        Update: Partial<Database["public"]["Tables"]["wishlist"]["Row"]>;
        Relationships: [];
      };
      reviews: {
        Row: { id: string; product_id: string; user_id: string; rating: number; title: string | null; body: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]> & { product_id: string; user_id: string; rating: number };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Relationships: [];
      };
      addresses: {
        Row: { id: string; user_id: string; label: string; full_name: string; phone: string; address_line1: string; city: string; district: string; postal_code: string | null; is_default: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["addresses"]["Row"]> & { user_id: string; label: string; full_name: string; phone: string; address_line1: string; city: string; district: string };
        Update: Partial<Database["public"]["Tables"]["addresses"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { user_role: "admin" | "staff" | "customer" };
  };
}
