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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accuracy_votes: {
        Row: {
          court_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          vote: string
        }
        Insert: {
          court_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          vote: string
        }
        Update: {
          court_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "accuracy_votes_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      agg_cities: {
        Row: {
          content: string | null
          id: string
          latitude: number | null
          listing_count: number | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          population: number | null
          slug: string
          state_abbr: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          latitude?: number | null
          listing_count?: number | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          population?: number | null
          slug: string
          state_abbr?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          latitude?: number | null
          listing_count?: number | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          population?: number | null
          slug?: string
          state_abbr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agg_cities_state_abbr_fkey"
            columns: ["state_abbr"]
            isOneToOne: false
            referencedRelation: "agg_states"
            referencedColumns: ["abbr"]
          },
        ]
      }
      agg_claim_requests: {
        Row: {
          business_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          msha_mine_id: string | null
          notes: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          msha_mine_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          msha_mine_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agg_contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          read: boolean | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          read?: boolean | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      agg_quote_requests: {
        Row: {
          company: string | null
          created_at: string | null
          delivery_address: string | null
          delivery_zip: string | null
          email: string
          id: string
          material_type: string
          name: string
          notes: string | null
          phone: string | null
          project_type: string | null
          quantity_tons: number | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_zip?: string | null
          email: string
          id?: string
          material_type: string
          name: string
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          quantity_tons?: number | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_zip?: string | null
          email?: string
          id?: string
          material_type?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_type?: string | null
          quantity_tons?: number | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agg_quote_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "agg_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      agg_reviews: {
        Row: {
          content: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          rating: number | null
          reviewer_email: string | null
          reviewer_name: string | null
          status: string | null
          supplier_id: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status?: string | null
          supplier_id?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status?: string | null
          supplier_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agg_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "agg_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      agg_search_logs: {
        Row: {
          created_at: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          material_type: string | null
          query: string | null
          radius_miles: number | null
          result_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          material_type?: string | null
          query?: string | null
          radius_miles?: number | null
          result_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          material_type?: string | null
          query?: string | null
          radius_miles?: number | null
          result_count?: number | null
        }
        Relationships: []
      }
      agg_states: {
        Row: {
          abbr: string
          content: string | null
          id: string
          listing_count: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
        }
        Insert: {
          abbr: string
          content?: string | null
          id?: string
          listing_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
        }
        Update: {
          abbr?: string
          content?: string | null
          id?: string
          listing_count?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      agg_submissions: {
        Row: {
          created_at: string | null
          id: string
          listing_data: Json
          status: string | null
          submitter_email: string | null
          submitter_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_data: Json
          status?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_data?: Json
          status?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
        }
        Relationships: []
      }
      agg_suppliers: {
        Row: {
          address: string | null
          city: string
          claim_user_id: string | null
          claimed: boolean | null
          claimed_at: string | null
          county: string | null
          created_at: string | null
          description: string | null
          email: string | null
          facility_type: string | null
          geo_point: unknown
          hours: Json | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          material_types: string[]
          meta_description: string | null
          meta_title: string | null
          msha_days_since_violation: number | null
          msha_employees: number | null
          msha_last_inspection: string | null
          msha_mine_id: string | null
          msha_primary_sic: string | null
          msha_safety_score: number | null
          msha_status: string | null
          msha_violation_count: number | null
          name: string
          phone: string | null
          photos: string[] | null
          rating: number | null
          review_count: number | null
          slug: string
          source: string | null
          source_url: string | null
          state: string
          state_abbr: string
          status: string | null
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city: string
          claim_user_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          county?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          facility_type?: string | null
          geo_point?: unknown
          hours?: Json | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          material_types?: string[]
          meta_description?: string | null
          meta_title?: string | null
          msha_days_since_violation?: number | null
          msha_employees?: number | null
          msha_last_inspection?: string | null
          msha_mine_id?: string | null
          msha_primary_sic?: string | null
          msha_safety_score?: number | null
          msha_status?: string | null
          msha_violation_count?: number | null
          name: string
          phone?: string | null
          photos?: string[] | null
          rating?: number | null
          review_count?: number | null
          slug: string
          source?: string | null
          source_url?: string | null
          state: string
          state_abbr: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          claim_user_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          county?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          facility_type?: string | null
          geo_point?: unknown
          hours?: Json | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          material_types?: string[]
          meta_description?: string | null
          meta_title?: string | null
          msha_days_since_violation?: number | null
          msha_employees?: number | null
          msha_last_inspection?: string | null
          msha_mine_id?: string | null
          msha_primary_sic?: string | null
          msha_safety_score?: number | null
          msha_status?: string | null
          msha_violation_count?: number | null
          name?: string
          phone?: string | null
          photos?: string[] | null
          rating?: number | null
          review_count?: number | null
          slug?: string
          source?: string | null
          source_url?: string | null
          state?: string
          state_abbr?: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      ai_picks: {
        Row: {
          bet_type: string
          confidence: number
          created_at: string
          data_sources: Json
          final_score: string | null
          graded_at: string | null
          id: string
          line: string | null
          locked_at: string
          opponent: string | null
          pick_date: string
          reasoning: string
          result: string
          sport: string
          team: string
          updated_at: string
        }
        Insert: {
          bet_type: string
          confidence: number
          created_at?: string
          data_sources?: Json
          final_score?: string | null
          graded_at?: string | null
          id?: string
          line?: string | null
          locked_at?: string
          opponent?: string | null
          pick_date?: string
          reasoning: string
          result?: string
          sport: string
          team: string
          updated_at?: string
        }
        Update: {
          bet_type?: string
          confidence?: number
          created_at?: string
          data_sources?: Json
          final_score?: string | null
          graded_at?: string | null
          id?: string
          line?: string | null
          locked_at?: string
          opponent?: string | null
          pick_date?: string
          reasoning?: string
          result?: string
          sport?: string
          team?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          application_status: string | null
          created_at: string | null
          current_address: string
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          employment_status: string
          first_name: string
          id: string
          last_name: string
          monthly_income: number
          notes: string | null
          phone: string
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          application_status?: string | null
          created_at?: string | null
          current_address: string
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          employment_status: string
          first_name: string
          id?: string
          last_name: string
          monthly_income: number
          notes?: string | null
          phone: string
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          application_status?: string | null
          created_at?: string | null
          current_address?: string
          email?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          employment_status?: string
          first_name?: string
          id?: string
          last_name?: string
          monthly_income?: number
          notes?: string | null
          phone?: string
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          ai_generated: boolean | null
          ai_model: string | null
          ai_prompt: string | null
          author: string | null
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured: boolean | null
          featured_image: string | null
          id: string
          published_at: string | null
          read_time: string | null
          seo_description: string | null
          seo_title: string | null
          site: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_model?: string | null
          ai_prompt?: string | null
          author?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          read_time?: string | null
          seo_description?: string | null
          seo_title?: string | null
          site?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_model?: string | null
          ai_prompt?: string | null
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          read_time?: string | null
          seo_description?: string | null
          seo_title?: string | null
          site?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      cappers: {
        Row: {
          created_at: string | null
          discord_user_id: string | null
          id: number
          name: string
          sheet_tab_name: string | null
        }
        Insert: {
          created_at?: string | null
          discord_user_id?: string | null
          id?: number
          name: string
          sheet_tab_name?: string | null
        }
        Update: {
          created_at?: string | null
          discord_user_id?: string | null
          id?: number
          name?: string
          sheet_tab_name?: string | null
        }
        Relationships: []
      }
      checkins: {
        Row: {
          court_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          court_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          court_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          court_count: number | null
          created_at: string | null
          id: string
          intro_text: string | null
          lat: number | null
          lng: number | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          state_abbr: string | null
          updated_at: string | null
        }
        Insert: {
          court_count?: number | null
          created_at?: string | null
          id?: string
          intro_text?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          state_abbr?: string | null
          updated_at?: string | null
        }
        Update: {
          court_count?: number | null
          created_at?: string | null
          id?: string
          intro_text?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          state_abbr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_abbr_fkey"
            columns: ["state_abbr"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["abbr"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          reason: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          reason?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          reason?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assistant_response: string
          created_at: string | null
          evaluated: boolean | null
          evaluation_id: string | null
          id: string
          session_id: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          assistant_response: string
          created_at?: string | null
          evaluated?: boolean | null
          evaluation_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          assistant_response?: string
          created_at?: string | null
          evaluated?: boolean | null
          evaluation_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      court_corrections: {
        Row: {
          court_id: string | null
          court_name: string | null
          created_at: string | null
          fields_to_update: string[] | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitter_email: string
          suggested_address: string | null
          suggested_court_count: number | null
          suggested_hours: string | null
          suggested_name: string | null
          suggested_phone: string | null
          suggested_website: string | null
        }
        Insert: {
          court_id?: string | null
          court_name?: string | null
          created_at?: string | null
          fields_to_update?: string[] | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitter_email: string
          suggested_address?: string | null
          suggested_court_count?: number | null
          suggested_hours?: string | null
          suggested_name?: string | null
          suggested_phone?: string | null
          suggested_website?: string | null
        }
        Update: {
          court_id?: string | null
          court_name?: string | null
          created_at?: string | null
          fields_to_update?: string[] | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitter_email?: string
          suggested_address?: string | null
          suggested_court_count?: number | null
          suggested_hours?: string | null
          suggested_name?: string | null
          suggested_phone?: string | null
          suggested_website?: string | null
        }
        Relationships: []
      }
      court_submissions: {
        Row: {
          address: string | null
          city: string
          court_count: number | null
          court_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          photos: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          state: string
          status: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          court_count?: number | null
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          photos?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          state: string
          status?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          court_count?: number | null
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photos?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          state?: string
          status?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_submissions_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          address: string | null
          ai_description: string | null
          ai_tips: string[] | null
          beginner_friendly: number | null
          best_for: string[] | null
          city: string
          competitive_level: number | null
          cost: string | null
          cost_notes: string | null
          country: string | null
          court_count: number | null
          court_quality: number | null
          created_at: string | null
          dedicated_courts: boolean | null
          description: string | null
          email: string | null
          equipment_rental: boolean | null
          facebook_url: string | null
          family_friendly: number | null
          featured: boolean | null
          featured_until: string | null
          food_nearby: boolean | null
          guest_policy: string | null
          hours: Json | null
          hours_notes: string | null
          id: string
          images: string[] | null
          indoor_outdoor: string | null
          instagram_url: string | null
          last_verified: string | null
          lat: number | null
          lessons_available: boolean | null
          lighting: boolean | null
          lng: number | null
          location: unknown
          membership_cost: string | null
          name: string
          overall_rating: number | null
          parking: string | null
          parking_notes: string | null
          peak_times: string | null
          permanent_nets: boolean | null
          phone: string | null
          premium_tier: string | null
          pro_shop: boolean | null
          public_private: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          restrooms: boolean | null
          review_count: number | null
          search_vector: unknown
          seasonal_hours: boolean | null
          seating: boolean | null
          seo_description: string | null
          seo_title: string | null
          shade: boolean | null
          slug: string
          source: string | null
          source_id: string | null
          source_url: string | null
          state: string
          state_abbr: string | null
          status: string | null
          surface_type: string[] | null
          thumbnail: string | null
          twitter_url: string | null
          updated_at: string | null
          user_rating: number | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
          water_fountain: boolean | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_description?: string | null
          ai_tips?: string[] | null
          beginner_friendly?: number | null
          best_for?: string[] | null
          city: string
          competitive_level?: number | null
          cost?: string | null
          cost_notes?: string | null
          country?: string | null
          court_count?: number | null
          court_quality?: number | null
          created_at?: string | null
          dedicated_courts?: boolean | null
          description?: string | null
          email?: string | null
          equipment_rental?: boolean | null
          facebook_url?: string | null
          family_friendly?: number | null
          featured?: boolean | null
          featured_until?: string | null
          food_nearby?: boolean | null
          guest_policy?: string | null
          hours?: Json | null
          hours_notes?: string | null
          id?: string
          images?: string[] | null
          indoor_outdoor?: string | null
          instagram_url?: string | null
          last_verified?: string | null
          lat?: number | null
          lessons_available?: boolean | null
          lighting?: boolean | null
          lng?: number | null
          location?: unknown
          membership_cost?: string | null
          name: string
          overall_rating?: number | null
          parking?: string | null
          parking_notes?: string | null
          peak_times?: string | null
          permanent_nets?: boolean | null
          phone?: string | null
          premium_tier?: string | null
          pro_shop?: boolean | null
          public_private?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          restrooms?: boolean | null
          review_count?: number | null
          search_vector?: unknown
          seasonal_hours?: boolean | null
          seating?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          shade?: boolean | null
          slug: string
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          state: string
          state_abbr?: string | null
          status?: string | null
          surface_type?: string[] | null
          thumbnail?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_rating?: number | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          water_fountain?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_description?: string | null
          ai_tips?: string[] | null
          beginner_friendly?: number | null
          best_for?: string[] | null
          city?: string
          competitive_level?: number | null
          cost?: string | null
          cost_notes?: string | null
          country?: string | null
          court_count?: number | null
          court_quality?: number | null
          created_at?: string | null
          dedicated_courts?: boolean | null
          description?: string | null
          email?: string | null
          equipment_rental?: boolean | null
          facebook_url?: string | null
          family_friendly?: number | null
          featured?: boolean | null
          featured_until?: string | null
          food_nearby?: boolean | null
          guest_policy?: string | null
          hours?: Json | null
          hours_notes?: string | null
          id?: string
          images?: string[] | null
          indoor_outdoor?: string | null
          instagram_url?: string | null
          last_verified?: string | null
          lat?: number | null
          lessons_available?: boolean | null
          lighting?: boolean | null
          lng?: number | null
          location?: unknown
          membership_cost?: string | null
          name?: string
          overall_rating?: number | null
          parking?: string | null
          parking_notes?: string | null
          peak_times?: string | null
          permanent_nets?: boolean | null
          phone?: string | null
          premium_tier?: string | null
          pro_shop?: boolean | null
          public_private?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          restrooms?: boolean | null
          review_count?: number | null
          search_vector?: unknown
          seasonal_hours?: boolean | null
          seating?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          shade?: boolean | null
          slug?: string
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          state?: string
          state_abbr?: string | null
          status?: string | null
          surface_type?: string[] | null
          thumbnail?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_rating?: number | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          water_fountain?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      daily_ai_report: {
        Row: {
          created_at: string
          expert_pick_count: number | null
          generated_at: string
          has_ballparkpal: boolean | null
          has_statcast: boolean | null
          id: number
          mlb_game_count: number | null
          report_date: string
          report_text: string
        }
        Insert: {
          created_at?: string
          expert_pick_count?: number | null
          generated_at?: string
          has_ballparkpal?: boolean | null
          has_statcast?: boolean | null
          id?: number
          mlb_game_count?: number | null
          report_date: string
          report_text: string
        }
        Update: {
          created_at?: string
          expert_pick_count?: number | null
          generated_at?: string
          has_ballparkpal?: boolean | null
          has_statcast?: boolean | null
          id?: number
          mlb_game_count?: number | null
          report_date?: string
          report_text?: string
        }
        Relationships: []
      }
      daily_processing_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: number
          process_date: string | null
          process_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: number
          process_date?: string | null
          process_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: number
          process_date?: string | null
          process_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          email: string
          id: string
          site: string | null
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          site?: string | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          site?: string | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          city: string | null
          cost: string | null
          court_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string | null
          featured: boolean | null
          featured_until: string | null
          id: string
          max_participants: number | null
          name: string
          organizer_email: string | null
          organizer_name: string | null
          organizer_phone: string | null
          recurrence_rule: string | null
          recurring: boolean | null
          registration_deadline: string | null
          registration_url: string | null
          skill_levels: string[] | null
          slug: string
          start_date: string
          start_time: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cost?: string | null
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured?: boolean | null
          featured_until?: string | null
          id?: string
          max_participants?: number | null
          name: string
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          registration_deadline?: string | null
          registration_url?: string | null
          skill_levels?: string[] | null
          slug: string
          start_date: string
          start_time?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cost?: string | null
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          featured?: boolean | null
          featured_until?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          registration_deadline?: string | null
          registration_url?: string | null
          skill_levels?: string[] | null
          slug?: string
          start_date?: string
          start_time?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          court_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          court_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          court_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_sync: {
        Row: {
          error_message: string | null
          id: number
          pick_id: number | null
          sheet_row: number | null
          sync_status: string | null
          synced_at: string | null
        }
        Insert: {
          error_message?: string | null
          id?: number
          pick_id?: number | null
          sheet_row?: number | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Update: {
          error_message?: string | null
          id?: number
          pick_id?: number | null
          sheet_row?: number | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_sheets_sync_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_results: {
        Row: {
          api_source: string | null
          graded_at: string | null
          id: number
          pick_id: number | null
          requires_manual_review: boolean | null
          result: string | null
          score: number | null
        }
        Insert: {
          api_source?: string | null
          graded_at?: string | null
          id?: number
          pick_id?: number | null
          requires_manual_review?: boolean | null
          result?: string | null
          score?: number | null
        }
        Update: {
          api_source?: string | null
          graded_at?: string | null
          id?: number
          pick_id?: number | null
          requires_manual_review?: boolean | null
          result?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_results_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_action_items: {
        Row: {
          assignee: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hb_api_usage: {
        Row: {
          created_at: string | null
          credits_used: number
          id: number
          notes: string | null
          requests_remaining: number | null
          requests_used: number | null
          script_name: string
          service: string | null
          sport: string | null
        }
        Insert: {
          created_at?: string | null
          credits_used?: number
          id?: number
          notes?: string | null
          requests_remaining?: number | null
          requests_used?: number | null
          script_name: string
          service?: string | null
          sport?: string | null
        }
        Update: {
          created_at?: string | null
          credits_used?: number
          id?: number
          notes?: string | null
          requests_remaining?: number | null
          requests_used?: number | null
          script_name?: string
          service?: string | null
          sport?: string | null
        }
        Relationships: []
      }
      hb_capper_aliases: {
        Row: {
          alias_text: string
          canonical_capper_id: string
          created_at: string | null
          id: string
          source: string
        }
        Insert: {
          alias_text: string
          canonical_capper_id: string
          created_at?: string | null
          id?: string
          source?: string
        }
        Update: {
          alias_text?: string
          canonical_capper_id?: string
          created_at?: string | null
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_aliases_canonical_capper_id_fkey"
            columns: ["canonical_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_aliases_canonical_capper_id_fkey"
            columns: ["canonical_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_aliases_canonical_capper_id_fkey"
            columns: ["canonical_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_aliases_canonical_capper_id_fkey"
            columns: ["canonical_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_capper_daily_stats: {
        Row: {
          avg_odds: number | null
          capper_id: string
          created_at: string | null
          current_streak: number | null
          id: string
          losses: number | null
          net_units: number | null
          pending: number | null
          picks_made: number | null
          pushes: number | null
          sport: string | null
          stat_date: string
          units_lost: number | null
          units_wagered: number | null
          units_won: number | null
          wins: number | null
        }
        Insert: {
          avg_odds?: number | null
          capper_id: string
          created_at?: string | null
          current_streak?: number | null
          id?: string
          losses?: number | null
          net_units?: number | null
          pending?: number | null
          picks_made?: number | null
          pushes?: number | null
          sport?: string | null
          stat_date: string
          units_lost?: number | null
          units_wagered?: number | null
          units_won?: number | null
          wins?: number | null
        }
        Update: {
          avg_odds?: number | null
          capper_id?: string
          created_at?: string | null
          current_streak?: number | null
          id?: string
          losses?: number | null
          net_units?: number | null
          pending?: number | null
          picks_made?: number | null
          pushes?: number | null
          sport?: string | null
          stat_date?: string
          units_lost?: number | null
          units_wagered?: number | null
          units_won?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_daily_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_daily_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_daily_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_daily_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_capper_follows: {
        Row: {
          capper_id: string
          created_at: string
          notify_push: boolean
          user_id: string
        }
        Insert: {
          capper_id: string
          created_at?: string
          notify_push?: boolean
          user_id: string
        }
        Update: {
          capper_id?: string
          created_at?: string
          notify_push?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_follows_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_follows_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_follows_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_follows_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_capper_lifetime_stats: {
        Row: {
          avg_picks_per_day: number | null
          best_win_streak: number | null
          capper_id: string
          current_streak: number | null
          days_active: number | null
          first_pick_date: string | null
          id: string
          last_10_losses: number | null
          last_10_record: string | null
          last_10_wins: number | null
          last_30_losses: number | null
          last_30_units: number | null
          last_30_wins: number | null
          last_pick_date: string | null
          net_units: number | null
          roi: number | null
          sport: string | null
          total_losses: number | null
          total_picks: number | null
          total_pushes: number | null
          total_units_lost: number | null
          total_units_wagered: number | null
          total_units_won: number | null
          total_wins: number | null
          updated_at: string | null
          win_rate: number | null
          worst_loss_streak: number | null
        }
        Insert: {
          avg_picks_per_day?: number | null
          best_win_streak?: number | null
          capper_id: string
          current_streak?: number | null
          days_active?: number | null
          first_pick_date?: string | null
          id?: string
          last_10_losses?: number | null
          last_10_record?: string | null
          last_10_wins?: number | null
          last_30_losses?: number | null
          last_30_units?: number | null
          last_30_wins?: number | null
          last_pick_date?: string | null
          net_units?: number | null
          roi?: number | null
          sport?: string | null
          total_losses?: number | null
          total_picks?: number | null
          total_pushes?: number | null
          total_units_lost?: number | null
          total_units_wagered?: number | null
          total_units_won?: number | null
          total_wins?: number | null
          updated_at?: string | null
          win_rate?: number | null
          worst_loss_streak?: number | null
        }
        Update: {
          avg_picks_per_day?: number | null
          best_win_streak?: number | null
          capper_id?: string
          current_streak?: number | null
          days_active?: number | null
          first_pick_date?: string | null
          id?: string
          last_10_losses?: number | null
          last_10_record?: string | null
          last_10_wins?: number | null
          last_30_losses?: number | null
          last_30_units?: number | null
          last_30_wins?: number | null
          last_pick_date?: string | null
          net_units?: number | null
          roi?: number | null
          sport?: string | null
          total_losses?: number | null
          total_picks?: number | null
          total_pushes?: number | null
          total_units_lost?: number | null
          total_units_wagered?: number | null
          total_units_won?: number | null
          total_wins?: number | null
          updated_at?: string | null
          win_rate?: number | null
          worst_loss_streak?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_lifetime_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_lifetime_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_lifetime_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_lifetime_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_capper_records: {
        Row: {
          capper_name: string
          id: string
          last_updated: string | null
          losses: number | null
          pushes: number | null
          roi_pct: number | null
          sport: string | null
          streak: number | null
          units_won: number | null
          wins: number | null
        }
        Insert: {
          capper_name: string
          id?: string
          last_updated?: string | null
          losses?: number | null
          pushes?: number | null
          roi_pct?: number | null
          sport?: string | null
          streak?: number | null
          units_won?: number | null
          wins?: number | null
        }
        Update: {
          capper_name?: string
          id?: string
          last_updated?: string | null
          losses?: number | null
          pushes?: number | null
          roi_pct?: number | null
          sport?: string | null
          streak?: number | null
          units_won?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      hb_capper_sport_stats: {
        Row: {
          best_bet_type: string | null
          best_bet_type_winrate: number | null
          capper_id: string
          id: string
          losses: number | null
          net_units: number | null
          pushes: number | null
          roi: number | null
          sport: string
          total_picks: number | null
          updated_at: string | null
          win_rate: number | null
          wins: number | null
          worst_bet_type: string | null
          worst_bet_type_winrate: number | null
        }
        Insert: {
          best_bet_type?: string | null
          best_bet_type_winrate?: number | null
          capper_id: string
          id?: string
          losses?: number | null
          net_units?: number | null
          pushes?: number | null
          roi?: number | null
          sport: string
          total_picks?: number | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
          worst_bet_type?: string | null
          worst_bet_type_winrate?: number | null
        }
        Update: {
          best_bet_type?: string | null
          best_bet_type_winrate?: number | null
          capper_id?: string
          id?: string
          losses?: number | null
          net_units?: number | null
          pushes?: number | null
          roi?: number | null
          sport?: string
          total_picks?: number | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
          worst_bet_type?: string | null
          worst_bet_type_winrate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_sport_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_sport_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_sport_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_sport_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_capper_stats: {
        Row: {
          avg_odds: number | null
          capper_id: string
          current_streak: number | null
          grade: string | null
          losses: number | null
          name: string | null
          pushes: number | null
          roi: number | null
          slug: string | null
          sport_records: Json | null
          total_picks: number | null
          units_wagered: number | null
          units_won: number | null
          updated_at: string | null
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          avg_odds?: number | null
          capper_id: string
          current_streak?: number | null
          grade?: string | null
          losses?: number | null
          name?: string | null
          pushes?: number | null
          roi?: number | null
          slug?: string | null
          sport_records?: Json | null
          total_picks?: number | null
          units_wagered?: number | null
          units_won?: number | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          avg_odds?: number | null
          capper_id?: string
          current_streak?: number | null
          grade?: string | null
          losses?: number | null
          name?: string | null
          pushes?: number | null
          roi?: number | null
          slug?: string | null
          sport_records?: Json | null
          total_picks?: number | null
          units_wagered?: number | null
          units_won?: number | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_capper_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: true
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: true
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: true
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_capper_stats_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: true
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_cappers: {
        Row: {
          aliases: string[] | null
          auto_detected: boolean | null
          bio: string | null
          created_at: string | null
          discord_avatar: string | null
          discord_channel_id: string | null
          discord_user_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          show_on_website: boolean | null
          slug: string
          source_priority: string | null
          sports: Database["public"]["Enums"]["hb_sport_type"][]
          tier: Database["public"]["Enums"]["hb_capper_tier"]
          track_picks: boolean | null
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          auto_detected?: boolean | null
          bio?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_channel_id?: string | null
          discord_user_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          show_on_website?: boolean | null
          slug: string
          source_priority?: string | null
          sports?: Database["public"]["Enums"]["hb_sport_type"][]
          tier?: Database["public"]["Enums"]["hb_capper_tier"]
          track_picks?: boolean | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          auto_detected?: boolean | null
          bio?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_channel_id?: string | null
          discord_user_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          show_on_website?: boolean | null
          slug?: string
          source_priority?: string | null
          sports?: Database["public"]["Enums"]["hb_sport_type"][]
          tier?: Database["public"]["Enums"]["hb_capper_tier"]
          track_picks?: boolean | null
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hb_clv_data: {
        Row: {
          capper_id: string | null
          closing_line: number | null
          clv: number | null
          consensus_tier: number | null
          created_at: string | null
          game_id: string
          id: number
          pick_id: string
          pick_line: number | null
          pick_type: string
          posted_at: string | null
          result: string | null
          sport: string
        }
        Insert: {
          capper_id?: string | null
          closing_line?: number | null
          clv?: number | null
          consensus_tier?: number | null
          created_at?: string | null
          game_id: string
          id?: number
          pick_id: string
          pick_line?: number | null
          pick_type: string
          posted_at?: string | null
          result?: string | null
          sport: string
        }
        Update: {
          capper_id?: string | null
          closing_line?: number | null
          clv?: number | null
          consensus_tier?: number | null
          created_at?: string | null
          game_id?: string
          id?: number
          pick_id?: string
          pick_line?: number | null
          pick_type?: string
          posted_at?: string | null
          result?: string | null
          sport?: string
        }
        Relationships: []
      }
      hb_consensus_snapshots: {
        Row: {
          away_team: string | null
          capper_count: number
          cappers: Json
          commence_time: string | null
          confidence_tier: string
          created_at: string
          final_score: string | null
          game_id: string
          graded_at: string | null
          home_team: string | null
          id: string
          is_clean: boolean
          opposing_cappers: number
          result: string | null
          side: string
          snapshot_date: string
          sport: string
          spread: number | null
          team: string
          total_units: number
        }
        Insert: {
          away_team?: string | null
          capper_count?: number
          cappers?: Json
          commence_time?: string | null
          confidence_tier: string
          created_at?: string
          final_score?: string | null
          game_id: string
          graded_at?: string | null
          home_team?: string | null
          id?: string
          is_clean?: boolean
          opposing_cappers?: number
          result?: string | null
          side: string
          snapshot_date?: string
          sport: string
          spread?: number | null
          team: string
          total_units?: number
        }
        Update: {
          away_team?: string | null
          capper_count?: number
          cappers?: Json
          commence_time?: string | null
          confidence_tier?: string
          created_at?: string
          final_score?: string | null
          game_id?: string
          graded_at?: string | null
          home_team?: string | null
          id?: string
          is_clean?: boolean
          opposing_cappers?: number
          result?: string | null
          side?: string
          snapshot_date?: string
          sport?: string
          spread?: number | null
          team?: string
          total_units?: number
        }
        Relationships: []
      }
      hb_contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string | null
          read: boolean | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      hb_discord_channels: {
        Row: {
          category: string | null
          channel_id: string
          channel_name: string
          created_at: string | null
          default_capper_id: string | null
          default_sport: string | null
          id: string
          is_active: boolean | null
          is_picks_channel: boolean | null
          server_id: string
          source_type: string
          tier: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          channel_id: string
          channel_name: string
          created_at?: string | null
          default_capper_id?: string | null
          default_sport?: string | null
          id?: string
          is_active?: boolean | null
          is_picks_channel?: boolean | null
          server_id: string
          source_type?: string
          tier?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          channel_id?: string
          channel_name?: string
          created_at?: string | null
          default_capper_id?: string | null
          default_sport?: string | null
          id?: string
          is_active?: boolean | null
          is_picks_channel?: boolean | null
          server_id?: string
          source_type?: string
          tier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_discord_channels_default_capper_id_fkey"
            columns: ["default_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_discord_channels_default_capper_id_fkey"
            columns: ["default_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_discord_channels_default_capper_id_fkey"
            columns: ["default_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_discord_channels_default_capper_id_fkey"
            columns: ["default_capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
        ]
      }
      hb_discord_messages: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          discord_author_avatar: string | null
          discord_author_name: string
          discord_channel_id: string
          discord_channel_name: string
          discord_message_id: string
          embeds: Json | null
          id: string
          is_premium: boolean | null
          posted_at: string
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          discord_author_avatar?: string | null
          discord_author_name: string
          discord_channel_id: string
          discord_channel_name: string
          discord_message_id: string
          embeds?: Json | null
          id?: string
          is_premium?: boolean | null
          posted_at: string
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          discord_author_avatar?: string | null
          discord_author_name?: string
          discord_channel_id?: string
          discord_channel_name?: string
          discord_message_id?: string
          embeds?: Json | null
          id?: string
          is_premium?: boolean | null
          posted_at?: string
        }
        Relationships: []
      }
      hb_game_picks: {
        Row: {
          capper_id: string | null
          capper_name: string
          created_at: string | null
          game_id: string | null
          id: string
          line: number | null
          market: string | null
          odds: number | null
          posted_at: string | null
          raw_pick: string | null
          side: string
          source: string | null
          team: string
          units: number | null
        }
        Insert: {
          capper_id?: string | null
          capper_name: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          line?: number | null
          market?: string | null
          odds?: number | null
          posted_at?: string | null
          raw_pick?: string | null
          side: string
          source?: string | null
          team: string
          units?: number | null
        }
        Update: {
          capper_id?: string | null
          capper_name?: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          line?: number | null
          market?: string | null
          odds?: number | null
          posted_at?: string | null
          raw_pick?: string | null
          side?: string
          source?: string | null
          team?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_game_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_game_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_game_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_game_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
          {
            foreignKeyName: "hb_game_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "hb_game_consensus"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "hb_game_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "hb_games"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_games: {
        Row: {
          away_score: number | null
          away_score_1h: number | null
          away_team: string
          closing_spread: number | null
          closing_total: number | null
          commence_time: string
          completed: boolean | null
          created_at: string | null
          espn_id: string | null
          home_score: number | null
          home_score_1h: number | null
          home_team: string
          id: string
          line_moved: boolean | null
          odds_api_id: string | null
          opening_spread: number | null
          opening_total: number | null
          period_scores: Json | null
          source: string | null
          sport: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          away_score?: number | null
          away_score_1h?: number | null
          away_team: string
          closing_spread?: number | null
          closing_total?: number | null
          commence_time: string
          completed?: boolean | null
          created_at?: string | null
          espn_id?: string | null
          home_score?: number | null
          home_score_1h?: number | null
          home_team: string
          id: string
          line_moved?: boolean | null
          odds_api_id?: string | null
          opening_spread?: number | null
          opening_total?: number | null
          period_scores?: Json | null
          source?: string | null
          sport: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          away_score?: number | null
          away_score_1h?: number | null
          away_team?: string
          closing_spread?: number | null
          closing_total?: number | null
          commence_time?: string
          completed?: boolean | null
          created_at?: string | null
          espn_id?: string | null
          home_score?: number | null
          home_score_1h?: number | null
          home_team?: string
          id?: string
          line_moved?: boolean | null
          odds_api_id?: string | null
          opening_spread?: number | null
          opening_total?: number | null
          period_scores?: Json | null
          source?: string | null
          sport?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hb_grading_log: {
        Row: {
          action: string
          confidence: string | null
          created_at: string | null
          grading_source: string | null
          id: string
          metadata: Json | null
          new_result: string | null
          old_result: string | null
          pick_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          confidence?: string | null
          created_at?: string | null
          grading_source?: string | null
          id?: string
          metadata?: Json | null
          new_result?: string | null
          old_result?: string | null
          pick_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          confidence?: string | null
          created_at?: string | null
          grading_source?: string | null
          id?: string
          metadata?: Json | null
          new_result?: string | null
          old_result?: string | null
          pick_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_grading_log_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "hb_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_line_history: {
        Row: {
          bookmaker: string
          game_id: string
          id: number
          market: string
          point: number | null
          price: number | null
          recorded_at: string
          team: string
        }
        Insert: {
          bookmaker: string
          game_id: string
          id?: number
          market: string
          point?: number | null
          price?: number | null
          recorded_at?: string
          team: string
        }
        Update: {
          bookmaker?: string
          game_id?: string
          id?: number
          market?: string
          point?: number | null
          price?: number | null
          recorded_at?: string
          team?: string
        }
        Relationships: []
      }
      hb_odds: {
        Row: {
          bookmaker: string
          game_id: string | null
          id: string
          market: string
          point: number | null
          price: number | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          bookmaker: string
          game_id?: string | null
          id?: string
          market: string
          point?: number | null
          price?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          bookmaker?: string
          game_id?: string | null
          id?: string
          market?: string
          point?: number | null
          price?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "hb_game_consensus"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "hb_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "hb_games"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_pick_features: {
        Row: {
          away_ats_pct: number | null
          away_over_pct: number | null
          away_ppg: number | null
          away_streak: number | null
          away_win_pct: number | null
          bet_category: string | null
          capper_avg_odds: number | null
          capper_grade: string | null
          capper_id: string | null
          capper_roi: number | null
          capper_sport_win_rate: number | null
          capper_streak: number | null
          capper_tier: string | null
          capper_total_picks: number | null
          capper_units_won: number | null
          capper_win_rate: number | null
          closing_spread: number | null
          closing_total: number | null
          clv: number | null
          confidence_score: number | null
          consensus_capper_count: number | null
          consensus_confidence_tier: string | null
          consensus_opposing_cappers: number | null
          consensus_total_units: number | null
          created_at: string | null
          graded_at: string | null
          home_ats_pct: number | null
          home_over_pct: number | null
          home_ppg: number | null
          home_streak: number | null
          home_win_pct: number | null
          hours_before_game: number | null
          id: number
          is_premium: boolean | null
          line_moved: boolean | null
          line_value: number | null
          odds: number | null
          opening_spread: number | null
          opening_total: number | null
          pick_id: string
          pick_type: string | null
          posted_dow: number | null
          posted_hour: number | null
          result: string | null
          sharp_money_signal: boolean | null
          sport: string | null
          steam_move_signal: boolean | null
          units: number | null
        }
        Insert: {
          away_ats_pct?: number | null
          away_over_pct?: number | null
          away_ppg?: number | null
          away_streak?: number | null
          away_win_pct?: number | null
          bet_category?: string | null
          capper_avg_odds?: number | null
          capper_grade?: string | null
          capper_id?: string | null
          capper_roi?: number | null
          capper_sport_win_rate?: number | null
          capper_streak?: number | null
          capper_tier?: string | null
          capper_total_picks?: number | null
          capper_units_won?: number | null
          capper_win_rate?: number | null
          closing_spread?: number | null
          closing_total?: number | null
          clv?: number | null
          confidence_score?: number | null
          consensus_capper_count?: number | null
          consensus_confidence_tier?: string | null
          consensus_opposing_cappers?: number | null
          consensus_total_units?: number | null
          created_at?: string | null
          graded_at?: string | null
          home_ats_pct?: number | null
          home_over_pct?: number | null
          home_ppg?: number | null
          home_streak?: number | null
          home_win_pct?: number | null
          hours_before_game?: number | null
          id?: number
          is_premium?: boolean | null
          line_moved?: boolean | null
          line_value?: number | null
          odds?: number | null
          opening_spread?: number | null
          opening_total?: number | null
          pick_id: string
          pick_type?: string | null
          posted_dow?: number | null
          posted_hour?: number | null
          result?: string | null
          sharp_money_signal?: boolean | null
          sport?: string | null
          steam_move_signal?: boolean | null
          units?: number | null
        }
        Update: {
          away_ats_pct?: number | null
          away_over_pct?: number | null
          away_ppg?: number | null
          away_streak?: number | null
          away_win_pct?: number | null
          bet_category?: string | null
          capper_avg_odds?: number | null
          capper_grade?: string | null
          capper_id?: string | null
          capper_roi?: number | null
          capper_sport_win_rate?: number | null
          capper_streak?: number | null
          capper_tier?: string | null
          capper_total_picks?: number | null
          capper_units_won?: number | null
          capper_win_rate?: number | null
          closing_spread?: number | null
          closing_total?: number | null
          clv?: number | null
          confidence_score?: number | null
          consensus_capper_count?: number | null
          consensus_confidence_tier?: string | null
          consensus_opposing_cappers?: number | null
          consensus_total_units?: number | null
          created_at?: string | null
          graded_at?: string | null
          home_ats_pct?: number | null
          home_over_pct?: number | null
          home_ppg?: number | null
          home_streak?: number | null
          home_win_pct?: number | null
          hours_before_game?: number | null
          id?: number
          is_premium?: boolean | null
          line_moved?: boolean | null
          line_value?: number | null
          odds?: number | null
          opening_spread?: number | null
          opening_total?: number | null
          pick_id?: string
          pick_type?: string | null
          posted_dow?: number | null
          posted_hour?: number | null
          result?: string | null
          sharp_money_signal?: boolean | null
          sport?: string | null
          steam_move_signal?: boolean | null
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_pick_features_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: true
            referencedRelation: "hb_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_picks: {
        Row: {
          actual_line: number | null
          actual_score: string | null
          actual_value: number | null
          analysis: string | null
          bet_category: string | null
          bet_type: string | null
          capper_id: string
          confidence: number | null
          confidence_score: number | null
          created_at: string | null
          dedup_hash: string | null
          game_time: string | null
          graded_at: string | null
          grading_source: string | null
          id: string
          is_parlay: boolean | null
          is_premium: boolean | null
          line: string | null
          line_value: number | null
          match_confidence: string | null
          matched_game_id: string | null
          odds: number
          opponent: string | null
          parlay_legs: Json | null
          parse_method: string | null
          pick_type: Database["public"]["Enums"]["hb_pick_type"]
          player_name: string | null
          posted_at: string | null
          prop_side: string | null
          prop_stat: string | null
          result: Database["public"]["Enums"]["hb_pick_result"] | null
          source: string | null
          source_message_id: string | null
          source_type: string | null
          sport: Database["public"]["Enums"]["hb_sport_type"]
          team: string
          units: number
          units_result: number | null
          updated_at: string | null
          void_reason: string | null
        }
        Insert: {
          actual_line?: number | null
          actual_score?: string | null
          actual_value?: number | null
          analysis?: string | null
          bet_category?: string | null
          bet_type?: string | null
          capper_id: string
          confidence?: number | null
          confidence_score?: number | null
          created_at?: string | null
          dedup_hash?: string | null
          game_time?: string | null
          graded_at?: string | null
          grading_source?: string | null
          id?: string
          is_parlay?: boolean | null
          is_premium?: boolean | null
          line?: string | null
          line_value?: number | null
          match_confidence?: string | null
          matched_game_id?: string | null
          odds: number
          opponent?: string | null
          parlay_legs?: Json | null
          parse_method?: string | null
          pick_type: Database["public"]["Enums"]["hb_pick_type"]
          player_name?: string | null
          posted_at?: string | null
          prop_side?: string | null
          prop_stat?: string | null
          result?: Database["public"]["Enums"]["hb_pick_result"] | null
          source?: string | null
          source_message_id?: string | null
          source_type?: string | null
          sport: Database["public"]["Enums"]["hb_sport_type"]
          team: string
          units?: number
          units_result?: number | null
          updated_at?: string | null
          void_reason?: string | null
        }
        Update: {
          actual_line?: number | null
          actual_score?: string | null
          actual_value?: number | null
          analysis?: string | null
          bet_category?: string | null
          bet_type?: string | null
          capper_id?: string
          confidence?: number | null
          confidence_score?: number | null
          created_at?: string | null
          dedup_hash?: string | null
          game_time?: string | null
          graded_at?: string | null
          grading_source?: string | null
          id?: string
          is_parlay?: boolean | null
          is_premium?: boolean | null
          line?: string | null
          line_value?: number | null
          match_confidence?: string | null
          matched_game_id?: string | null
          odds?: number
          opponent?: string | null
          parlay_legs?: Json | null
          parse_method?: string | null
          pick_type?: Database["public"]["Enums"]["hb_pick_type"]
          player_name?: string | null
          posted_at?: string | null
          prop_side?: string | null
          prop_stat?: string | null
          result?: Database["public"]["Enums"]["hb_pick_result"] | null
          source?: string | null
          source_message_id?: string | null
          source_type?: string | null
          sport?: Database["public"]["Enums"]["hb_sport_type"]
          team?: string
          units?: number
          units_result?: number | null
          updated_at?: string | null
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hb_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_cappers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_hot_streaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "hb_today_summary"
            referencedColumns: ["capper_id"]
          },
          {
            foreignKeyName: "hb_picks_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "hb_raw_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_picks_archive: {
        Row: {
          actual_line: number | null
          actual_score: string | null
          analysis: string | null
          archived_at: string | null
          bet_type: string | null
          capper_id: string
          confidence: number | null
          created_at: string | null
          dedup_hash: string | null
          game_time: string | null
          graded_at: string | null
          id: string
          is_parlay: boolean | null
          is_premium: boolean | null
          line: string | null
          line_value: number | null
          odds: number
          opponent: string | null
          parlay_legs: Json | null
          pick_type: Database["public"]["Enums"]["hb_pick_type"]
          posted_at: string | null
          result: Database["public"]["Enums"]["hb_pick_result"] | null
          source: string | null
          sport: Database["public"]["Enums"]["hb_sport_type"]
          team: string
          units: number
          units_result: number | null
          updated_at: string | null
        }
        Insert: {
          actual_line?: number | null
          actual_score?: string | null
          analysis?: string | null
          archived_at?: string | null
          bet_type?: string | null
          capper_id: string
          confidence?: number | null
          created_at?: string | null
          dedup_hash?: string | null
          game_time?: string | null
          graded_at?: string | null
          id?: string
          is_parlay?: boolean | null
          is_premium?: boolean | null
          line?: string | null
          line_value?: number | null
          odds: number
          opponent?: string | null
          parlay_legs?: Json | null
          pick_type: Database["public"]["Enums"]["hb_pick_type"]
          posted_at?: string | null
          result?: Database["public"]["Enums"]["hb_pick_result"] | null
          source?: string | null
          sport: Database["public"]["Enums"]["hb_sport_type"]
          team: string
          units?: number
          units_result?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_line?: number | null
          actual_score?: string | null
          analysis?: string | null
          archived_at?: string | null
          bet_type?: string | null
          capper_id?: string
          confidence?: number | null
          created_at?: string | null
          dedup_hash?: string | null
          game_time?: string | null
          graded_at?: string | null
          id?: string
          is_parlay?: boolean | null
          is_premium?: boolean | null
          line?: string | null
          line_value?: number | null
          odds?: number
          opponent?: string | null
          parlay_legs?: Json | null
          pick_type?: Database["public"]["Enums"]["hb_pick_type"]
          posted_at?: string | null
          result?: Database["public"]["Enums"]["hb_pick_result"] | null
          source?: string | null
          sport?: Database["public"]["Enums"]["hb_sport_type"]
          team?: string
          units?: number
          units_result?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hb_player_game_stats: {
        Row: {
          assists: number | null
          blocks: number | null
          earned_runs: number | null
          espn_event_id: string | null
          fetched_at: string | null
          field_goals_attempted: number | null
          field_goals_made: number | null
          free_throws_attempted: number | null
          free_throws_made: number | null
          game_id: string | null
          goals: number | null
          hits: number | null
          hockey_assists: number | null
          home_runs: number | null
          id: string
          innings_pitched: number | null
          minutes: number | null
          passing_tds: number | null
          passing_yards: number | null
          player_name: string
          points: number | null
          rbis: number | null
          rebounds: number | null
          receiving_tds: number | null
          receiving_yards: number | null
          receptions: number | null
          rushing_tds: number | null
          rushing_yards: number | null
          sacks: number | null
          saves: number | null
          shots_on_goal: number | null
          source: string
          sport: string
          steals: number | null
          strikeouts_pitcher: number | null
          team: string
          three_pointers_made: number | null
          turnovers: number | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          earned_runs?: number | null
          espn_event_id?: string | null
          fetched_at?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_id?: string | null
          goals?: number | null
          hits?: number | null
          hockey_assists?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          minutes?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          player_name: string
          points?: number | null
          rbis?: number | null
          rebounds?: number | null
          receiving_tds?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          sacks?: number | null
          saves?: number | null
          shots_on_goal?: number | null
          source: string
          sport: string
          steals?: number | null
          strikeouts_pitcher?: number | null
          team: string
          three_pointers_made?: number | null
          turnovers?: number | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          earned_runs?: number | null
          espn_event_id?: string | null
          fetched_at?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          game_id?: string | null
          goals?: number | null
          hits?: number | null
          hockey_assists?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          minutes?: number | null
          passing_tds?: number | null
          passing_yards?: number | null
          player_name?: string
          points?: number | null
          rbis?: number | null
          rebounds?: number | null
          receiving_tds?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_tds?: number | null
          rushing_yards?: number | null
          sacks?: number | null
          saves?: number | null
          shots_on_goal?: number | null
          source?: string
          sport?: string
          steals?: number | null
          strikeouts_pitcher?: number | null
          team?: string
          three_pointers_made?: number | null
          turnovers?: number | null
        }
        Relationships: []
      }
      hb_player_stats: {
        Row: {
          assists: number | null
          blocks: number | null
          fetched_at: string | null
          game_id: string
          game_name: string | null
          id: number
          player_name: string
          points: number | null
          rebounds: number | null
          source: string | null
          steals: number | null
          team: string | null
          threes: number | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          fetched_at?: string | null
          game_id: string
          game_name?: string | null
          id?: never
          player_name: string
          points?: number | null
          rebounds?: number | null
          source?: string | null
          steals?: number | null
          team?: string | null
          threes?: number | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          fetched_at?: string | null
          game_id?: string
          game_name?: string | null
          id?: never
          player_name?: string
          points?: number | null
          rebounds?: number | null
          source?: string | null
          steals?: number | null
          team?: string | null
          threes?: number | null
        }
        Relationships: []
      }
      hb_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hb_push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hb_raw_messages: {
        Row: {
          attachments_json: Json | null
          author_id: string | null
          author_name: string | null
          channel_id: string
          content: string | null
          embeds_json: Json | null
          error_message: string | null
          id: string
          message_id: string
          parsed_at: string | null
          parsed_status: string
          pick_ids: string[] | null
          posted_at: string | null
          received_at: string | null
          source: string
        }
        Insert: {
          attachments_json?: Json | null
          author_id?: string | null
          author_name?: string | null
          channel_id: string
          content?: string | null
          embeds_json?: Json | null
          error_message?: string | null
          id?: string
          message_id: string
          parsed_at?: string | null
          parsed_status?: string
          pick_ids?: string[] | null
          posted_at?: string | null
          received_at?: string | null
          source?: string
        }
        Update: {
          attachments_json?: Json | null
          author_id?: string | null
          author_name?: string | null
          channel_id?: string
          content?: string | null
          embeds_json?: Json | null
          error_message?: string | null
          id?: string
          message_id?: string
          parsed_at?: string | null
          parsed_status?: string
          pick_ids?: string[] | null
          posted_at?: string | null
          received_at?: string | null
          source?: string
        }
        Relationships: []
      }
      hb_saved_picks: {
        Row: {
          created_at: string | null
          id: string
          pick_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pick_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pick_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hb_saved_picks_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "hb_picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hb_saved_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hb_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_signals: {
        Row: {
          alerted: boolean | null
          away_team: string | null
          books_moved: string[] | null
          current_line: number | null
          detected_at: string | null
          game_id: string
          home_team: string | null
          id: number
          market: string
          move_amount: number | null
          opening_line: number | null
          signal_type: string
          sport: string
          team: string | null
        }
        Insert: {
          alerted?: boolean | null
          away_team?: string | null
          books_moved?: string[] | null
          current_line?: number | null
          detected_at?: string | null
          game_id: string
          home_team?: string | null
          id?: number
          market: string
          move_amount?: number | null
          opening_line?: number | null
          signal_type: string
          sport: string
          team?: string | null
        }
        Update: {
          alerted?: boolean | null
          away_team?: string | null
          books_moved?: string[] | null
          current_line?: number | null
          detected_at?: string | null
          game_id?: string
          home_team?: string | null
          id?: number
          market?: string
          move_amount?: number | null
          opening_line?: number | null
          signal_type?: string
          sport?: string
          team?: string | null
        }
        Relationships: []
      }
      hb_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          expires_at: string | null
          id: string
          plan_name: string
          plan_type: string | null
          status: Database["public"]["Enums"]["hb_subscription_status"]
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          expires_at?: string | null
          id?: string
          plan_name: string
          plan_type?: string | null
          status?: Database["public"]["Enums"]["hb_subscription_status"]
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          expires_at?: string | null
          id?: string
          plan_name?: string
          plan_type?: string | null
          status?: Database["public"]["Enums"]["hb_subscription_status"]
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hb_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "hb_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hb_team_enrichment: {
        Row: {
          conference: string | null
          confidence: number | null
          created_at: string | null
          extract: string | null
          id: number
          level: string | null
          name_upper: string
          original_name: string
          source: string | null
          sport: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          conference?: string | null
          confidence?: number | null
          created_at?: string | null
          extract?: string | null
          id?: never
          level?: string | null
          name_upper: string
          original_name: string
          source?: string | null
          sport?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          conference?: string | null
          confidence?: number | null
          created_at?: string | null
          extract?: string | null
          id?: never
          level?: string | null
          name_upper?: string
          original_name?: string
          source?: string | null
          sport?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      hb_team_stats: {
        Row: {
          api_sports_id: number | null
          avg_total: number | null
          away_losses: number | null
          away_ppg: number | null
          away_wins: number | null
          balldontlie_id: number | null
          created_at: string | null
          current_streak: string | null
          home_losses: number | null
          home_ppg: number | null
          home_wins: number | null
          id: string
          last_game_date: string | null
          last10_losses: number | null
          last10_record: string | null
          last10_wins: number | null
          league: string | null
          losses: number | null
          opp_ppg: number | null
          ppg: number | null
          season: string | null
          sport: string
          streak_count: number | null
          streak_type: string | null
          team_abbrev: string | null
          team_name: string
          updated_at: string | null
          win_pct: number | null
          wins: number | null
        }
        Insert: {
          api_sports_id?: number | null
          avg_total?: number | null
          away_losses?: number | null
          away_ppg?: number | null
          away_wins?: number | null
          balldontlie_id?: number | null
          created_at?: string | null
          current_streak?: string | null
          home_losses?: number | null
          home_ppg?: number | null
          home_wins?: number | null
          id?: string
          last_game_date?: string | null
          last10_losses?: number | null
          last10_record?: string | null
          last10_wins?: number | null
          league?: string | null
          losses?: number | null
          opp_ppg?: number | null
          ppg?: number | null
          season?: string | null
          sport: string
          streak_count?: number | null
          streak_type?: string | null
          team_abbrev?: string | null
          team_name: string
          updated_at?: string | null
          win_pct?: number | null
          wins?: number | null
        }
        Update: {
          api_sports_id?: number | null
          avg_total?: number | null
          away_losses?: number | null
          away_ppg?: number | null
          away_wins?: number | null
          balldontlie_id?: number | null
          created_at?: string | null
          current_streak?: string | null
          home_losses?: number | null
          home_ppg?: number | null
          home_wins?: number | null
          id?: string
          last_game_date?: string | null
          last10_losses?: number | null
          last10_record?: string | null
          last10_wins?: number | null
          league?: string | null
          losses?: number | null
          opp_ppg?: number | null
          ppg?: number | null
          season?: string | null
          sport?: string
          streak_count?: number | null
          streak_type?: string | null
          team_abbrev?: string | null
          team_name?: string
          updated_at?: string | null
          win_pct?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          cost: number | null
          created_at: string | null
          description: string
          id: string
          notes: string | null
          priority: string | null
          property_id: string | null
          request_type: string
          scheduled_date: string | null
          status: string | null
          tenant_email: string
          tenant_name: string
          tenant_phone: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          priority?: string | null
          property_id?: string | null
          request_type: string
          scheduled_date?: string | null
          status?: string | null
          tenant_email: string
          tenant_name: string
          tenant_phone: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          priority?: string | null
          property_id?: string | null
          request_type?: string
          scheduled_date?: string | null
          status?: string | null
          tenant_email?: string
          tenant_name?: string
          tenant_phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
          status: string | null
          subscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          due_date: string
          id: string
          late_fee: number | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_status: string | null
          payment_type: string
          property_address: string | null
          property_id: string | null
          stripe_payment_intent_id: string | null
          tenant_email: string
          tenant_name: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_status?: string | null
          payment_type: string
          property_address?: string | null
          property_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_email: string
          tenant_name: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_status?: string | null
          payment_type?: string
          property_address?: string | null
          property_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_email?: string
          tenant_name?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          court_id: string | null
          created_at: string | null
          id: string
          status: string | null
          thumbnail_url: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          court_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          thumbnail_url?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          court_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          thumbnail_url?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          bet_type: string | null
          capper_id: number | null
          confidence_score: number | null
          created_at: string | null
          game_info: string | null
          id: number
          odds: string | null
          original_text: string
          pick_date: string | null
        }
        Insert: {
          bet_type?: string | null
          capper_id?: number | null
          confidence_score?: number | null
          created_at?: string | null
          game_info?: string | null
          id?: number
          odds?: string | null
          original_text: string
          pick_date?: string | null
        }
        Update: {
          bet_type?: string | null
          capper_id?: number | null
          confidence_score?: number | null
          created_at?: string | null
          game_info?: string | null
          id?: number
          odds?: string | null
          original_text?: string
          pick_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_capper_id_fkey"
            columns: ["capper_id"]
            isOneToOne: false
            referencedRelation: "cappers"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: string | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          property_type: string | null
          rent_amount: number
          square_feet: number | null
          state: string
          updated_at: string | null
          utilities_included: boolean | null
          zip_code: string
        }
        Insert: {
          address: string
          amenities?: string | null
          bathrooms?: number
          bedrooms?: number
          city: string
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          property_type?: string | null
          rent_amount: number
          square_feet?: number | null
          state: string
          updated_at?: string | null
          utilities_included?: boolean | null
          zip_code: string
        }
        Update: {
          address?: string
          amenities?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          property_type?: string | null
          rent_amount?: number
          square_feet?: number | null
          state?: string
          updated_at?: string | null
          utilities_included?: boolean | null
          zip_code?: string
        }
        Relationships: []
      }
      property_images: {
        Row: {
          created_at: string | null
          id: string
          image_order: number | null
          image_url: string
          is_primary: boolean | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_order?: number | null
          image_url: string
          is_primary?: boolean | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_order?: number | null
          image_url?: string
          is_primary?: boolean | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          analysis: string | null
          average_score: number | null
          conversations_evaluated: string[] | null
          created_at: string | null
          decision: string | null
          id: string
          new_prompt_version: number | null
          prompt_updated: boolean | null
          scores: Json
        }
        Insert: {
          analysis?: string | null
          average_score?: number | null
          conversations_evaluated?: string[] | null
          created_at?: string | null
          decision?: string | null
          id?: string
          new_prompt_version?: number | null
          prompt_updated?: boolean | null
          scores: Json
        }
        Update: {
          analysis?: string | null
          average_score?: number | null
          conversations_evaluated?: string[] | null
          created_at?: string | null
          decision?: string | null
          id?: string
          new_prompt_version?: number | null
          prompt_updated?: boolean | null
          scores?: Json
        }
        Relationships: []
      }
      reviews: {
        Row: {
          cons: string[] | null
          content: string | null
          court_id: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          pros: string[] | null
          rating: number | null
          skill_level: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visit_date: string | null
        }
        Insert: {
          cons?: string[] | null
          content?: string | null
          court_id?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          pros?: string[] | null
          rating?: number | null
          skill_level?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Update: {
          cons?: string[] | null
          content?: string | null
          court_id?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          pros?: string[] | null
          rating?: number | null
          skill_level?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      states: {
        Row: {
          abbr: string
          city_count: number | null
          court_count: number | null
          created_at: string | null
          id: string
          intro_text: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          abbr: string
          city_count?: number | null
          court_count?: number | null
          created_at?: string | null
          id?: string
          intro_text?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          abbr?: string
          city_count?: number | null
          court_count?: number | null
          created_at?: string | null
          id?: string
          intro_text?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          court_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          court_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          court_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          addressed: boolean | null
          category: string | null
          created_at: string | null
          hidden: boolean | null
          id: string
          priority: string | null
          reflection_id: string | null
          suggestion_text: string
        }
        Insert: {
          addressed?: boolean | null
          category?: string | null
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          priority?: string | null
          reflection_id?: string | null
          suggestion_text: string
        }
        Update: {
          addressed?: boolean | null
          category?: string | null
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          priority?: string | null
          reflection_id?: string | null
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "reflections"
            referencedColumns: ["id"]
          },
        ]
      }
      system_prompts: {
        Row: {
          change_reason: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          prompt_text: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt_text: string
          version: number
        }
        Update: {
          change_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt_text?: string
          version?: number
        }
        Relationships: []
      }
      team_normalization: {
        Row: {
          created_at: string | null
          id: number
          search_terms: string[]
          sport: string
          team_abbr: string
          team_name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          search_terms: string[]
          sport: string
          team_abbr: string
          team_name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          search_terms?: string[]
          sport?: string
          team_abbr?: string
          team_name?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          password_hash: string
          phone: string | null
          property_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          password_hash: string
          phone?: string | null
          property_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          password_hash?: string
          phone?: string | null
          property_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_picks_by_confidence: {
        Row: {
          confidence: number | null
          losses: number | null
          total: number | null
          win_pct: number | null
          wins: number | null
        }
        Relationships: []
      }
      ai_picks_by_sport: {
        Row: {
          losses: number | null
          pushes: number | null
          sport: string | null
          win_pct: number | null
          wins: number | null
        }
        Relationships: []
      }
      ai_picks_daily_summary: {
        Row: {
          decided: number | null
          losses: number | null
          pending: number | null
          pick_date: string | null
          pushes: number | null
          win_pct: number | null
          wins: number | null
        }
        Relationships: []
      }
      ai_picks_overall: {
        Row: {
          first_pick_date: string | null
          last_pick_date: string | null
          losses: number | null
          pending: number | null
          pushes: number | null
          total_picks: number | null
          win_pct: number | null
          wins: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      hb_game_consensus: {
        Row: {
          away_picks: number | null
          away_team: string | null
          away_units: number | null
          commence_time: string | null
          game_id: string | null
          home_picks: number | null
          home_team: string | null
          home_units: number | null
          over_picks: number | null
          over_units: number | null
          sport: string | null
          total_cappers: number | null
          under_picks: number | null
          under_units: number | null
        }
        Relationships: []
      }
      hb_hot_streaks: {
        Row: {
          current_streak: number | null
          id: string | null
          image_url: string | null
          last_10_record: string | null
          last_30_units: number | null
          name: string | null
          slug: string | null
        }
        Relationships: []
      }
      hb_leaderboard: {
        Row: {
          current_streak: number | null
          id: string | null
          image_url: string | null
          last_10_record: string | null
          last_30_units: number | null
          last_pick_date: string | null
          name: string | null
          net_units: number | null
          roi: number | null
          roi_rank: number | null
          slug: string | null
          tier: Database["public"]["Enums"]["hb_capper_tier"] | null
          total_losses: number | null
          total_picks: number | null
          total_wins: number | null
          units_rank: number | null
          win_rate: number | null
          winrate_rank: number | null
        }
        Relationships: []
      }
      hb_today_summary: {
        Row: {
          capper_id: string | null
          capper_name: string | null
          line: string | null
          odds: number | null
          posted_at: string | null
          result: Database["public"]["Enums"]["hb_pick_result"] | null
          slug: string | null
          sport: Database["public"]["Enums"]["hb_sport_type"] | null
          team: string | null
          units: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      agg_nearby_suppliers: {
        Args: {
          facility_filter?: string
          lat: number
          lng: number
          material_filter?: string
          radius_meters?: number
          result_limit?: number
        }
        Returns: {
          address: string
          city: string
          claimed: boolean
          distance_meters: number
          facility_type: string
          id: string
          latitude: number
          longitude: number
          material_types: string[]
          name: string
          phone: string
          rating: number
          review_count: number
          slug: string
          state_abbr: string
          status: string
          website: string
        }[]
      }
      create_new_prompt_version: {
        Args: { new_prompt: string; reason: string }
        Returns: number
      }
      detect_parlay:
        | {
            Args: { p_capper_id: number; p_pick_date: string }
            Returns: {
              parlay_id: string
              pick_id: number
            }[]
          }
        | {
            Args: { p_capper_id: string; p_pick_date: string }
            Returns: {
              parlay_id: string
              pick_id: string
            }[]
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_courts_nearby: {
        Args: { radius_miles?: number; search_lat: number; search_lng: number }
        Returns: {
          address: string
          city: string
          cost: string
          court_count: number
          distance_miles: number
          id: string
          indoor_outdoor: string
          lat: number
          lighting: boolean
          lng: number
          name: string
          overall_rating: number
          public_private: string
          slug: string
          state: string
          state_abbr: string
          thumbnail: string
        }[]
      }
      generate_bet_key: {
        Args: {
          p_bet_type: string
          p_direction: string
          p_line: number
          p_sport: string
          p_team_abbr: string
        }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_prompt: { Args: never; Returns: string }
      get_betting_consensus: {
        Args: { p_date?: string; p_min_cappers?: number; p_sport?: string }
        Returns: {
          avg_odds: number
          bet_key: string
          bet_type: string
          capper_count: number
          capper_names: string[]
          direction: string
          is_fire: boolean
          is_parlay_combo: boolean
          line: number
          parlay_groups: string[]
          player_name: string
          prop_stat: string
          sport: string
          team_abbr: string
          total_units: number
        }[]
      }
      get_cities_in_state: {
        Args: { state_abbr_param: string }
        Returns: {
          city: string
          court_count: number
        }[]
      }
      get_states_with_courts: {
        Args: never
        Returns: {
          city_count: number
          court_count: number
          state_abbr: string
          state_name: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      hb_archive_old_picks: { Args: never; Returns: number }
      hb_cleanup_old_messages: { Args: never; Returns: undefined }
      hb_is_admin: { Args: never; Returns: boolean }
      hb_refresh_capper_stats: { Args: never; Returns: undefined }
      hb_snapshot_daily_stats: { Args: never; Returns: undefined }
      hb_update_capper_lifetime_stats: { Args: never; Returns: undefined }
      longtransactionsenabled: { Args: never; Returns: boolean }
      normalize_betting_picks: {
        Args: { p_date?: string }
        Returns: Database["public"]["CompositeTypes"]["normalized_pick"][]
        SetofOptions: {
          from: "*"
          to: "normalized_pick"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      normalize_team_name: {
        Args: { p_sport: string; p_team_text: string }
        Returns: string
      }
      parse_bet_details: {
        Args: { p_sport: string; p_text: string }
        Returns: {
          bet_type: string
          direction: string
          is_player_prop: boolean
          line: number
          odds: number
          player_name: string
          prop_stat: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      rollback_prompt: { Args: { target_version: number }; Returns: boolean }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      hb_capper_tier: "premium_favorite" | "premium" | "regular" | "rare"
      hb_pick_result:
        | "pending"
        | "win"
        | "loss"
        | "push"
        | "cancelled"
        | "expired"
      hb_pick_type: "spread" | "moneyline" | "over" | "under" | "prop"
      hb_sport_type:
        | "nfl"
        | "nba"
        | "mlb"
        | "nhl"
        | "ncaaf"
        | "ncaab"
        | "soccer"
        | "mma"
        | "other"
        | "tennis"
        | "golf"
        | "boxing"
      hb_subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "unpaid"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      normalized_pick: {
        pick_id: string | null
        capper_id: string | null
        capper_name: string | null
        sport: string | null
        team_abbr: string | null
        bet_type: string | null
        line: number | null
        direction: string | null
        odds: number | null
        units: number | null
        is_parlay: boolean | null
        parlay_id: string | null
        is_player_prop: boolean | null
        player_name: string | null
        prop_stat: string | null
        bet_key: string | null
        original_text: string | null
        created_at: string | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      hb_capper_tier: ["premium_favorite", "premium", "regular", "rare"],
      hb_pick_result: [
        "pending",
        "win",
        "loss",
        "push",
        "cancelled",
        "expired",
      ],
      hb_pick_type: ["spread", "moneyline", "over", "under", "prop"],
      hb_sport_type: [
        "nfl",
        "nba",
        "mlb",
        "nhl",
        "ncaaf",
        "ncaab",
        "soccer",
        "mma",
        "other",
        "tennis",
        "golf",
        "boxing",
      ],
      hb_subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "unpaid",
      ],
    },
  },
} as const
