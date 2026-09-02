export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          postal_code: string | null
          province: string | null
          street: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          province?: string | null
          street?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          province?: string | null
          street?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address_id: string | null
          company_name: string | null
          created_at: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          fiscal_code: string | null
          id: string
          marketing_consent: boolean | null
          newsletter_consent: boolean | null
          vat_number: string | null
        }
        Insert: {
          billing_address_id?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          fiscal_code?: string | null
          id: string
          marketing_consent?: boolean | null
          newsletter_consent?: boolean | null
          vat_number?: string | null
        }
        Update: {
          billing_address_id?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          fiscal_code?: string | null
          id?: string
          marketing_consent?: boolean | null
          newsletter_consent?: boolean | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          job_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          professional_id: string | null
          scheduled_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          professional_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          professional_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          job_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          job_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          job_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          quantity_sqm: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity_sqm: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity_sqm?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_services: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          quantity: number
          service_type: string
          total_price: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          quantity?: number
          service_type: string
          total_price: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          quantity?: number
          service_type?: string
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          delivery_address_id: string | null
          floor_sqm: number | null
          id: string
          installation_address: Json | null
          installation_date: string | null
          installation_professional_id: string | null
          intervention_type: string | null
          items: Json | null
          laying_total: number | null
          laying_type: string | null
          material_total: number | null
          notes: string | null
          order_number: string
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          professional_id: string | null
          professional_payout: number | null
          project_type: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          services_total: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          user_id: string | null
          vat_amount: number | null
          wall_sqm: number | null
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address_id?: string | null
          floor_sqm?: number | null
          id?: string
          installation_address?: Json | null
          installation_date?: string | null
          installation_professional_id?: string | null
          intervention_type?: string | null
          items?: Json | null
          laying_total?: number | null
          laying_type?: string | null
          material_total?: number | null
          notes?: string | null
          order_number: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          professional_id?: string | null
          professional_payout?: number | null
          project_type?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          services_total?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
          vat_amount?: number | null
          wall_sqm?: number | null
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address_id?: string | null
          floor_sqm?: number | null
          id?: string
          installation_address?: Json | null
          installation_date?: string | null
          installation_professional_id?: string | null
          intervention_type?: string | null
          items?: Json | null
          laying_total?: number | null
          laying_type?: string | null
          material_total?: number | null
          notes?: string | null
          order_number?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          professional_id?: string | null
          professional_payout?: number | null
          project_type?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          services_total?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
          vat_amount?: number | null
          wall_sqm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_installation_professional_id_fkey"
            columns: ["installation_professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null
          certifications: string[] | null
          color_hex: string | null
          color_name: string | null
          cost_per_sqm: number | null
          created_at: string | null
          datasheet_url: string | null
          description: string | null
          finish: Database["public"]["Enums"]["product_finish"] | null
          format_height: number | null
          format_width: number | null
          id: string
          images: Json | null
          lead_time_days: number | null
          material: Database["public"]["Enums"]["product_material"] | null
          min_order_sqm: number | null
          name: string
          price_per_sqm: number
          seo_description: string | null
          seo_title: string | null
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"] | null
          stock_qty: number | null
          style_tags: string[] | null
          supplier_id: string | null
          thickness: number | null
          tileable_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"] | null
          certifications?: string[] | null
          color_hex?: string | null
          color_name?: string | null
          cost_per_sqm?: number | null
          created_at?: string | null
          datasheet_url?: string | null
          description?: string | null
          finish?: Database["public"]["Enums"]["product_finish"] | null
          format_height?: number | null
          format_width?: number | null
          id?: string
          images?: Json | null
          lead_time_days?: number | null
          material?: Database["public"]["Enums"]["product_material"] | null
          min_order_sqm?: number | null
          name: string
          price_per_sqm: number
          seo_description?: string | null
          seo_title?: string | null
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_qty?: number | null
          style_tags?: string[] | null
          supplier_id?: string | null
          thickness?: number | null
          tileable_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"] | null
          certifications?: string[] | null
          color_hex?: string | null
          color_name?: string | null
          cost_per_sqm?: number | null
          created_at?: string | null
          datasheet_url?: string | null
          description?: string | null
          finish?: Database["public"]["Enums"]["product_finish"] | null
          format_height?: number | null
          format_width?: number | null
          id?: string
          images?: Json | null
          lead_time_days?: number | null
          material?: Database["public"]["Enums"]["product_material"] | null
          min_order_sqm?: number | null
          name?: string
          price_per_sqm?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_qty?: number | null
          style_tags?: string[] | null
          supplier_id?: string | null
          thickness?: number | null
          tileable_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          created_at: string | null
          date: string
          id: string
          note: string | null
          professional_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          note?: string | null
          professional_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          professional_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          billing_address: string | null
          billing_cap: string | null
          billing_city: string | null
          billing_province: string | null
          bio: string | null
          company_name: string | null
          created_at: string | null
          fiscal_code: string | null
          full_name: string | null
          id: string
          markup_fixed: number
          markup_percent: number
          pec: string | null
          phone: string | null
          price_per_sqm: number | null
          rating: number | null
          sdi_code: string | null
          updated_at: string | null
          vat_number: string | null
          verified: boolean | null
          years_experience: number | null
        }
        Insert: {
          billing_address?: string | null
          billing_cap?: string | null
          billing_city?: string | null
          billing_province?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          fiscal_code?: string | null
          full_name?: string | null
          id: string
          markup_fixed?: number
          markup_percent?: number
          pec?: string | null
          phone?: string | null
          price_per_sqm?: number | null
          rating?: number | null
          sdi_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Update: {
          billing_address?: string | null
          billing_cap?: string | null
          billing_city?: string | null
          billing_province?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          fiscal_code?: string | null
          full_name?: string | null
          id?: string
          markup_fixed?: number
          markup_percent?: number
          pec?: string | null
          phone?: string | null
          price_per_sqm?: number | null
          rating?: number | null
          sdi_code?: string | null
          updated_at?: string | null
          vat_number?: string | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Relationships: []
      }
      professional_skills: {
        Row: {
          created_at: string | null
          id: string
          professional_id: string | null
          skill_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          skill_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          skill_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_skills_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_zones: {
        Row: {
          created_at: string | null
          id: string
          professional_id: string | null
          province_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          province_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          province_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_zones_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          badges: Json | null
          base_rate_per_sqm: number | null
          created_at: string | null
          durc_doc_url: string | null
          durc_expiry: string | null
          fiscal_code: string | null
          iban: string | null
          id: string
          insurance_doc_url: string | null
          insurance_expiry: string | null
          jobs_completed: number | null
          max_radius_km: number | null
          onboarding_status:
            | Database["public"]["Enums"]["professional_status"]
            | null
          rating_avg: number | null
          rating_count: number | null
          vat_number: string | null
        }
        Insert: {
          badges?: Json | null
          base_rate_per_sqm?: number | null
          created_at?: string | null
          durc_doc_url?: string | null
          durc_expiry?: string | null
          fiscal_code?: string | null
          iban?: string | null
          id: string
          insurance_doc_url?: string | null
          insurance_expiry?: string | null
          jobs_completed?: number | null
          max_radius_km?: number | null
          onboarding_status?:
            | Database["public"]["Enums"]["professional_status"]
            | null
          rating_avg?: number | null
          rating_count?: number | null
          vat_number?: string | null
        }
        Update: {
          badges?: Json | null
          base_rate_per_sqm?: number | null
          created_at?: string | null
          durc_doc_url?: string | null
          durc_expiry?: string | null
          fiscal_code?: string | null
          iban?: string | null
          id?: string
          insurance_doc_url?: string | null
          insurance_expiry?: string | null
          jobs_completed?: number | null
          max_radius_km?: number | null
          onboarding_status?:
            | Database["public"]["Enums"]["professional_status"]
            | null
          rating_avg?: number | null
          rating_count?: number | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_response: string | null
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_public: boolean | null
          order_id: string | null
          photos: Json | null
          professional_id: string | null
          rating: number
        }
        Insert: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          photos?: Json | null
          professional_id?: string | null
          rating: number
        }
        Update: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_public?: boolean | null
          order_id?: string | null
          photos?: Json | null
          professional_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_quotes: {
        Row: {
          address: string | null
          ai_result_image: string | null
          cap: string | null
          city: string | null
          converted_order_id: string | null
          created_at: string | null
          customer_id: string | null
          floor_sqm: number | null
          id: string
          laying_total: number | null
          laying_type: string | null
          material_total: number | null
          name: string | null
          product_id: string | null
          professional_id: string | null
          project_type: string | null
          provincia: string | null
          scheduled_date: string | null
          services: Json | null
          services_total: number | null
          status: string | null
          total: number | null
          updated_at: string | null
          wall_sqm: number | null
        }
        Insert: {
          address?: string | null
          ai_result_image?: string | null
          cap?: string | null
          city?: string | null
          converted_order_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          floor_sqm?: number | null
          id?: string
          laying_total?: number | null
          laying_type?: string | null
          material_total?: number | null
          name?: string | null
          product_id?: string | null
          professional_id?: string | null
          project_type?: string | null
          provincia?: string | null
          scheduled_date?: string | null
          services?: Json | null
          services_total?: number | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
          wall_sqm?: number | null
        }
        Update: {
          address?: string | null
          ai_result_image?: string | null
          cap?: string | null
          city?: string | null
          converted_order_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          floor_sqm?: number | null
          id?: string
          laying_total?: number | null
          laying_type?: string | null
          material_total?: number | null
          name?: string | null
          product_id?: string | null
          professional_id?: string | null
          project_type?: string | null
          provincia?: string | null
          scheduled_date?: string | null
          services?: Json | null
          services_total?: number | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
          wall_sqm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          id: string
          last_login: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          id: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      customer_type: "private" | "business"
      order_status:
        | "draft"
        | "new"
        | "confirmed"
        | "assigned"
        | "material_shipped"
        | "material_delivered"
        | "in_progress"
        | "completed"
        | "disputed"
        | "refunded"
      product_category: "floor" | "wall" | "outdoor" | "mosaic"
      product_finish: "matt" | "glossy" | "textured" | "lappato"
      product_material: "gres" | "ceramic" | "cotto" | "natural_stone"
      product_status: "draft" | "active" | "out_of_stock" | "discontinued"
      professional_status:
        | "pending"
        | "documents"
        | "training"
        | "trial"
        | "active"
      user_role: "admin" | "professional" | "customer"
      user_status: "active" | "suspended" | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      customer_type: ["private", "business"],
      order_status: [
        "draft",
        "new",
        "confirmed",
        "assigned",
        "material_shipped",
        "material_delivered",
        "in_progress",
        "completed",
        "disputed",
        "refunded",
      ],
      product_category: ["floor", "wall", "outdoor", "mosaic"],
      product_finish: ["matt", "glossy", "textured", "lappato"],
      product_material: ["gres", "ceramic", "cotto", "natural_stone"],
      product_status: ["draft", "active", "out_of_stock", "discontinued"],
      professional_status: [
        "pending",
        "documents",
        "training",
        "trial",
        "active",
      ],
      user_role: ["admin", "professional", "customer"],
      user_status: ["active", "suspended", "deleted"],
    },
  },
} as const
