CREATE TYPE "block_status" AS ENUM (
  'basic_registration',
  'phone_number_verified',
  'digilocker',
  'pan_verification',
  'gst_number_verification',
  'bank_account_verified',
  'pending_kyc_verification',
  'profile_updated',
  'none'
);

CREATE TYPE "inventory_type" AS ENUM (
  'inner',
  'outer'
);

CREATE TYPE "notification_channel" AS ENUM (
  'sms',
  'push'
);

CREATE TYPE "notification_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'delivered'
);

CREATE TYPE "notification_trigger_type" AS ENUM (
  'automated',
  'campaign',
  'manual'
);

CREATE TYPE "otp_type" AS ENUM (
  'login',
  'password_reset',
  'registration',
  'kyc'
);

CREATE TABLE "amazon_marketplace_products" (
  "amazon_marketplace_product_id" SERIAL PRIMARY KEY NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "amazon_product_name" text NOT NULL,
  "amazon_model_no" text,
  "amazon_product_description" text,
  "amazon_mrp" numeric(10,2),
  "amazon_discounted_price" numeric(10,2),
  "amazon_csp_on_amazon" numeric(10,2),
  "amazon_inventory_count" integer DEFAULT 0,
  "amazon_points" integer NOT NULL,
  "amazon_diff" numeric(10,2),
  "amazon_url" text,
  "amazon_category" text,
  "amazon_category_image_path" text,
  "amazon_sub_category" text,
  "amazon_sub_category_image_path" text,
  "amazon_product_image_path" text,
  "amazon_comments_vendor" text,
  "is_amz_product_active" boolean DEFAULT true,
  "uploaded_by" integer,
  "uploaded_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "amazon_order_items" (
  "order_item_id" SERIAL PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "asin_sku" text NOT NULL,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "points_per_item" integer NOT NULL,
  "total_points" integer NOT NULL,
  "status" text DEFAULT 'processing',
  "status_history" jsonb DEFAULT ('[]'::jsonb),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "amazon_tickets" (
  "ticket_id" SERIAL PRIMARY KEY NOT NULL,
  "ticket_number" text NOT NULL,
  "order_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "product_id" integer,
  "asin_sku" text,
  "reason" text NOT NULL,
  "request_type" text NOT NULL,
  "status" text DEFAULT 'PENDING',
  "resolution_notes" text,
  "resolved_at" timestamp,
  "resolved_by" integer,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "app_configs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "description" text,
  "updated_by" integer,
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "approval_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "table_name" text NOT NULL,
  "record_id" integer NOT NULL,
  "operation" text NOT NULL,
  "action" text NOT NULL,
  "changed_by" integer,
  "change_source" text,
  "correlation_id" text,
  "old_state" jsonb,
  "new_state" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "campaigns" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "scheme_type" integer NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_active" boolean DEFAULT true,
  "budget" integer DEFAULT 0,
  "spent_budget" integer DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "client" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" text
);

CREATE TABLE "creatives" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type_id" integer NOT NULL,
  "url" varchar(500) NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "carousel_name" text NOT NULL,
  "display_order" integer DEFAULT 0,
  "target_audience" jsonb DEFAULT ('{}'::jsonb),
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "is_active" boolean DEFAULT true,
  "start_date" timestamp,
  "end_date" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "creatives_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "earning_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "event_handler_config" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "event_key" text NOT NULL,
  "handler_name" text NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "event_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "event_id" integer NOT NULL,
  "action" text NOT NULL,
  "event_type" text NOT NULL,
  "entity_id" text,
  "correlation_id" text,
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "event_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "event_key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "template_id" integer
);

CREATE TABLE "inapp_notifications" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "kyc_documents" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "document_type" text NOT NULL,
  "document_value" text NOT NULL,
  "verification_status" text NOT NULL DEFAULT 'pending',
  "verification_result" jsonb,
  "verified_at" timestamp,
  "rejection_reason" text,
  "expiry_date" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "languages" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "ledgers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "redemption_type" integer NOT NULL,
  "amount" numeric NOT NULL,
  "type" text NOT NULL,
  "remarks" text,
  "opening_balance" numeric(18,2) DEFAULT '0',
  "closing_balance" numeric(18,2) DEFAULT '0',
  "last_updated" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "location_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_id" integer NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" text,
  "parent_entity_id" integer
);

CREATE TABLE "location_entity_pincode" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "entity_id" integer NOT NULL,
  "pincode_id" integer NOT NULL
);

CREATE TABLE "location_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "notification_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "channel" notification_channel NOT NULL,
  "template_id" integer,
  "triggerType" notification_trigger_type NOT NULL,
  "status" notification_status DEFAULT 'pending',
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "sent_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notification_templates" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "triggerType" notification_trigger_type NOT NULL DEFAULT 'automated',
  "push_title" text,
  "push_body" text,
  "sms_body" text,
  "sms_dlt_template_id" text,
  "sms_entity_id" text,
  "sms_message_type" text,
  "sms_source_address" text,
  "sms_customer_id" text,
  "placeholders" jsonb DEFAULT ('[]'::jsonb),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "type" text NOT NULL,
  "channel" text NOT NULL,
  "template_key" text,
  "trigger" text NOT NULL,
  "is_sent" boolean DEFAULT false,
  "sent_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "onboarding_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "otp_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "phone" varchar(20) NOT NULL,
  "otp" text NOT NULL,
  "type" otp_type NOT NULL,
  "user_id" integer,
  "attempts" integer NOT NULL DEFAULT 0,
  "is_used" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "participant_sku_access" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "sku_level_id" integer NOT NULL,
  "sku_entity_id" integer,
  "access_type" varchar(20) DEFAULT 'specific',
  "valid_from" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "valid_to" timestamp,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "physical_rewards_catalogue" (
  "reward_id" SERIAL PRIMARY KEY NOT NULL,
  "reward_name" text NOT NULL,
  "reward_description" text,
  "category" text,
  "points_required" integer NOT NULL,
  "mrp" numeric(10,2),
  "inventory_count" integer DEFAULT 0,
  "image_url" text,
  "brand" text,
  "delivery_time" text DEFAULT '15-21 working days',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "physical_rewards_redemptions" (
  "redemption_id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_request_id" text NOT NULL,
  "user_id" integer NOT NULL,
  "reward_id" integer NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "points_deducted" integer NOT NULL,
  "shipping_address" jsonb NOT NULL,
  "status" text DEFAULT 'PENDING',
  "tracking_number" text,
  "courier_name" text,
  "estimated_delivery" timestamp,
  "delivered_at" timestamp,
  "delivery_proof" text,
  "approved_by" integer,
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "pincode_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "pincode" text NOT NULL,
  "city" text,
  "district" text,
  "state" text,
  "zone" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "qr_codes" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "sku" text NOT NULL,
  "batch_number" text NOT NULL,
  "type_id" integer NOT NULL,
  "code" text NOT NULL,
  "security_code" text NOT NULL,
  "manufacturing_date" timestamp NOT NULL,
  "mono_sub_mono_id" text,
  "parent_qr_id" integer,
  "is_scanned" boolean DEFAULT false,
  "scanned_by" integer,
  "monthly_volume" integer,
  "location_access" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "qr_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "redemption_bank_transfers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "account_number" text NOT NULL,
  "ifsc_code" text NOT NULL,
  "account_holder_name" text NOT NULL,
  "bankName" text,
  "razorpay_payout_id" text,
  "razorpay_fund_account_id" text,
  "razorpay_contact_id" text,
  "utr" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemption_channels" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "code" text
);

CREATE TABLE "redemption_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "redemption_upi" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "upi_id" text NOT NULL,
  "razorpay_payout_id" text,
  "razorpay_fund_account_id" text,
  "razorpay_contact_id" text,
  "utr" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemption_vouchers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "voucher_code" text NOT NULL,
  "voucher_pin" text,
  "platform_voucher_id" text,
  "platform_order_id" text,
  "valid_from" timestamp DEFAULT (now()),
  "valid_until" timestamp,
  "is_redeemed" boolean DEFAULT false,
  "redeemed_at" timestamp,
  "brand" text,
  "denomination" numeric(10,2),
  "txn_id" text,
  "voucher_name" text,
  "rate" numeric(10,2),
  "qty" integer,
  "status" text,
  "txn_time" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemptions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "redemption_id" text NOT NULL,
  "channel_id" integer NOT NULL,
  "points_redeemed" integer NOT NULL,
  "amount" integer,
  "status" integer NOT NULL,
  "scheme_id" integer,
  "metadata" jsonb NOT NULL,
  "approved_by" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now()),
  "channel_reference_id" integer
);

CREATE TABLE "referrals" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "referrer_id" integer NOT NULL,
  "referred_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "bonus_awarded" integer DEFAULT 0,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "scheme_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "schemes" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "scheme_type" integer NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_active" boolean DEFAULT true,
  "budget" integer DEFAULT 0,
  "spent_budget" integer DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "sku_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_id" integer NOT NULL,
  "name" varchar(200) NOT NULL,
  "code" text,
  "parent_entity_id" integer,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "sku_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "sku_point_config" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "sku_variant_id" integer NOT NULL,
  "user_type_id" integer NOT NULL,
  "points_per_unit" numeric(10,2) NOT NULL,
  "valid_from" timestamp,
  "valid_to" timestamp,
  "remarks" text,
  "max_scans_per_day" integer DEFAULT 5,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "sku_point_rules" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "priority" integer DEFAULT 0,
  "client_id" integer NOT NULL,
  "location_entity_id" integer,
  "sku_entity_id" integer,
  "sku_variant_id" integer,
  "user_type_id" integer,
  "action_type" varchar(20) NOT NULL,
  "action_value" numeric NOT NULL,
  "is_active" boolean DEFAULT true,
  "valid_from" timestamp,
  "valid_to" timestamp,
  "description" text
);

CREATE TABLE "sku_variant" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "sku_entity_id" integer NOT NULL,
  "variantName" varchar(150) NOT NULL,
  "pack_size" text,
  "mrp" numeric(10,2),
  "is_active" boolean DEFAULT true
);

CREATE TABLE "system_logs" (
  "log_id" SERIAL PRIMARY KEY NOT NULL,
  "log_level" text NOT NULL,
  "component_name" text NOT NULL,
  "message" text NOT NULL,
  "exception_trace" text,
  "action" text NOT NULL,
  "correlation_id" text,
  "api_endpoint" text,
  "user_id" integer,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "tbl_inventory" (
  "inventory_id" SERIAL PRIMARY KEY NOT NULL,
  "serialNumber" varchar(255) NOT NULL,
  "batch_id" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_qr_scanned" boolean NOT NULL DEFAULT false
);

CREATE TABLE "tbl_inventory_batch" (
  "batch_id" SERIAL PRIMARY KEY NOT NULL,
  "skuCode" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "type" inventory_type NOT NULL,
  "fileUrl" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" integer,
  "updated_by" integer,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "tbl_random_keys" (
  "random_key_id" SERIAL PRIMARY KEY NOT NULL,
  "randomKey" varchar(255) NOT NULL,
  "status" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "tds_records" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "financial_year" text NOT NULL,
  "tds_kitty" numeric NOT NULL DEFAULT '0',
  "tds_deducted" numeric NOT NULL DEFAULT '0',
  "reversed_amount" numeric NOT NULL DEFAULT '0',
  "status" text NOT NULL DEFAULT 'active',
  "settled_at" timestamp,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "third_party_api_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer,
  "provider" text NOT NULL,
  "api_type" text NOT NULL,
  "api_endpoint" text NOT NULL,
  "http_method" text,
  "request_payload" jsonb,
  "response_payload" jsonb,
  "http_status_code" integer,
  "is_success" boolean,
  "error_message" text,
  "webhook_event_type" text,
  "webhook_signature" text,
  "response_time_ms" integer,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "third_party_verification_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "verification_type" text NOT NULL,
  "provider" text NOT NULL,
  "request_data" jsonb NOT NULL,
  "response_data" jsonb NOT NULL,
  "response_object" jsonb NOT NULL,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "ticket_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "ticket_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "tickets" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type_id" integer NOT NULL,
  "status_id" integer NOT NULL,
  "subject" text,
  "description" text NOT NULL,
  "imageUrl" varchar(500),
  "videoUrl" varchar(500),
  "priority" text DEFAULT 'Medium',
  "assignee_id" integer,
  "created_by" integer NOT NULL,
  "resolution_notes" text,
  "resolved_at" timestamp,
  "attachments" jsonb DEFAULT ('[]'::jsonb),
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "tmp_third_party_verification_logs" (
  "id" text,
  "user_id" text,
  "verification_type" text,
  "provider" text,
  "request_data" text,
  "response_data" text,
  "response_object" text,
  "metadata" text,
  "created_at" text
);

CREATE TABLE "transaction_logs" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "points" numeric NOT NULL,
  "category" text NOT NULL,
  "subcategory" text,
  "sku" text,
  "status" text NOT NULL,
  "batch_number" text,
  "serial_number" text,
  "qr_code" text,
  "remarks" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "metadata" jsonb NOT NULL,
  "scheme_id" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "transactions" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "points" numeric NOT NULL,
  "category" text NOT NULL,
  "subcategory" text,
  "sku" text,
  "batch_number" text,
  "serial_number" text,
  "qr_code" text,
  "remarks" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "metadata" jsonb NOT NULL,
  "scheme_id" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_amazon_cart" (
  "cart_id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "added_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_amazon_orders" (
  "user_amz_order_id" SERIAL PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "user_id" integer NOT NULL,
  "redemption_id" text,
  "order_data" jsonb NOT NULL,
  "orderStatus" text DEFAULT 'processing',
  "points_deducted" integer NOT NULL,
  "tds_deducted" integer DEFAULT 0,
  "shipping_details" jsonb,
  "tracking_details" jsonb,
  "estimated_delivery" timestamp,
  "delivered_at" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_amazon_wishlist" (
  "wishlist_id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "added_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_associations" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "parent_user_id" integer NOT NULL,
  "child_user_id" integer NOT NULL,
  "association_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_balances" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "unique_id" text,
  "points_balance" numeric(18,2) DEFAULT '0',
  "total_earnings" numeric(18,2) DEFAULT '0',
  "total_balance" numeric(18,2) DEFAULT '0',
  "total_redeemed" numeric(18,2) DEFAULT '0',
  "redeemable_points" numeric(18,2) DEFAULT '0',
  "tds_percentage" integer DEFAULT 0,
  "tds_kitty" numeric(18,2) DEFAULT '0',
  "tds_deducted" numeric(18,2) DEFAULT '0',
  "last_settlement_date" timestamp,
  "is_kyc_verified" boolean DEFAULT false,
  "is_bank_validated" boolean DEFAULT false,
  "sap_customer_code" text,
  "tds_consent" boolean NOT NULL DEFAULT false
);

CREATE TABLE "user_profiles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text,
  "email" text,
  "dob" timestamp,
  "gender" text,
  "city" text,
  "district" text,
  "state" text,
  "pincode" text,
  "aadhaar" text,
  "pan" text,
  "gst" text,
  "shop_name" text,
  "electrician_certificate" text,
  "aadhaar_address" text,
  "address_line_1" text,
  "address_line_2" text,
  "attached_retailer_id" integer,
  "metadata" jsonb DEFAULT ('{}'::jsonb)
);

CREATE TABLE "user_scope_mapping" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_type_id" integer,
  "user_id" integer,
  "scope_type" varchar(20) NOT NULL,
  "scope_level_id" integer NOT NULL,
  "scope_entity_id" integer,
  "access_type" varchar(20) NOT NULL DEFAULT 'specific',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_type_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "level_id" integer NOT NULL,
  "type_name" text NOT NULL,
  "parent_type_id" integer,
  "is_active" boolean DEFAULT true,
  "remarks" text,
  "max_daily_scans" integer DEFAULT 50,
  "required_kyc_level" text DEFAULT 'Basic',
  "allowed_redemption_channels" jsonb DEFAULT ('[]'::jsonb),
  "is_referral_enabled" boolean DEFAULT true,
  "referral_reward_points" integer DEFAULT 0,
  "referee_reward_points" integer DEFAULT 0,
  "max_referrals" integer DEFAULT 10,
  "referral_code_prefix" text,
  "referral_validity_days" integer,
  "referral_success_message" text
);

CREATE TABLE "user_type_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "role_id" integer NOT NULL,
  "name" text,
  "phone" text NOT NULL,
  "email" text,
  "password" text,
  "pin" text,
  "location" jsonb,
  "referral_code" text,
  "referrer_id" integer,
  "onboarding_type_id" integer NOT NULL,
  "approval_status_id" integer NOT NULL,
  "language_id" integer NOT NULL DEFAULT 1,
  "is_suspended" boolean DEFAULT false,
  "suspended_at" timestamp,
  "fcm_token" text,
  "last_login_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "block_status" block_status DEFAULT 'basic_registration',
  "profile_photo_url" text
);

CREATE UNIQUE INDEX "amazon_asin_sku_unique" ON "amazon_marketplace_products" USING BTREE ("amazon_asin_sku");

CREATE UNIQUE INDEX "amazon_tickets_ticket_number_unique" ON "amazon_tickets" ("ticket_number");

CREATE UNIQUE INDEX "app_configs_key_key" ON "app_configs" ("key");

CREATE UNIQUE INDEX "approval_statuses_name_key" ON "approval_statuses" ("name");

CREATE UNIQUE INDEX "client_code_key" ON "client" ("code");

CREATE UNIQUE INDEX "creatives_types_name_key" ON "creatives_types" ("name");

CREATE UNIQUE INDEX "earning_types_name_key" ON "earning_types" ("name");

CREATE UNIQUE INDEX "event_handler_config_event_handler_key" ON "event_handler_config" USING BTREE ("event_key", "handler_name");

CREATE UNIQUE INDEX "event_master_event_key_key" ON "event_master" ("event_key");

CREATE UNIQUE INDEX "event_master_name_key" ON "event_master" ("name");

CREATE UNIQUE INDEX "kyc_documents_user_id_type_key" ON "kyc_documents" ("user_id", "document_type");

CREATE UNIQUE INDEX "languages_name_key" ON "languages" ("name");

CREATE UNIQUE INDEX "ledgers_user_id_key" ON "ledgers" ("user_id");

CREATE UNIQUE INDEX "notification_templates_slug_unique" ON "notification_templates" ("slug");

CREATE UNIQUE INDEX "onboarding_types_name_key" ON "onboarding_types" ("name");

CREATE UNIQUE INDEX "participant_sku_access_user_id_sku_level_id_sku_entity_id_key" ON "participant_sku_access" ("user_id", "sku_level_id", "sku_entity_id");

CREATE UNIQUE INDEX "physical_rewards_redemptions_redemption_request_id_unique" ON "physical_rewards_redemptions" ("redemption_request_id");

CREATE UNIQUE INDEX "pincode_master_pincode_key" ON "pincode_master" ("pincode");

CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes" ("code");

CREATE UNIQUE INDEX "qr_types_name_key" ON "qr_types" ("name");

CREATE UNIQUE INDEX "redemption_bank_transfers_redemption_id_unique" ON "redemption_bank_transfers" ("redemption_id");

CREATE UNIQUE INDEX "redemption_channels_name_key" ON "redemption_channels" ("name");

CREATE UNIQUE INDEX "redemption_channels_code_unique" ON "redemption_channels" ("code");

CREATE UNIQUE INDEX "redemption_statuses_name_key" ON "redemption_statuses" ("name");

CREATE UNIQUE INDEX "redemption_upi_redemption_id_unique" ON "redemption_upi" ("redemption_id");

CREATE UNIQUE INDEX "redemptions_redemption_id_key" ON "redemptions" ("redemption_id");

CREATE UNIQUE INDEX "scheme_types_name_key" ON "scheme_types" ("name");

CREATE UNIQUE INDEX "uq_client_level" ON "sku_level_master" USING BTREE ("client_id", "level_no");

CREATE UNIQUE INDEX "uq_sku_user_type" ON "sku_point_config" USING BTREE ("client_id", "sku_variant_id", "user_type_id");

CREATE UNIQUE INDEX "tbl_inventory_serial_number_unique" ON "tbl_inventory" ("serialNumber");

CREATE UNIQUE INDEX "tbl_random_keys_random_key_unique" ON "tbl_random_keys" ("randomKey");

CREATE UNIQUE INDEX "tds_records_user_id_fy_key" ON "tds_records" ("user_id", "financial_year");

CREATE UNIQUE INDEX "ticket_statuses_name_key" ON "ticket_statuses" ("name");

CREATE UNIQUE INDEX "ticket_types_name_key" ON "ticket_types" ("name");

CREATE UNIQUE INDEX "user_cart_unique" ON "user_amazon_cart" USING BTREE ("user_id", "amazon_asin_sku");

CREATE UNIQUE INDEX "user_amazon_orders_order_id_unique" ON "user_amazon_orders" ("order_id");

CREATE UNIQUE INDEX "user_wishlist_unique" ON "user_amazon_wishlist" USING BTREE ("user_id", "amazon_asin_sku");

CREATE UNIQUE INDEX "user_associations_parent_child_type_key" ON "user_associations" ("parent_user_id", "child_user_id", "association_type");

CREATE UNIQUE INDEX "user_balances_user_id_unique" ON "user_balances" ("user_id");

CREATE UNIQUE INDEX "user_balances_unique_id_unique" ON "user_balances" ("unique_id");

CREATE UNIQUE INDEX "user_balances_user_id_key" ON "user_balances" ("user_id");

CREATE UNIQUE INDEX "user_profiles_user_id_unique" ON "user_profiles" ("user_id");

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles" ("user_id");

CREATE UNIQUE INDEX "user_scope_mapping_unique" ON "user_scope_mapping" USING BTREE ("user_type_id", "user_id", "scope_type", "scope_level_id", "scope_entity_id");

CREATE UNIQUE INDEX "users_phone_key" ON "users" ("phone");

CREATE UNIQUE INDEX "users_referral_code_key" ON "users" ("referral_code");

CREATE UNIQUE INDEX "users_email_unique_not_null" ON "users" USING BTREE ("email");

ALTER TABLE "amazon_marketplace_products" ADD CONSTRAINT "amazon_products_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "user_amazon_orders" ("user_amz_order_id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "amazon_marketplace_products" ("amazon_marketplace_product_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "user_amazon_orders" ("user_amz_order_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "app_configs" ADD CONSTRAINT "app_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "scheme_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "creatives" ADD CONSTRAINT "creatives_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "creatives_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_master" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_master" ADD CONSTRAINT "event_master_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inapp_notifications" ADD CONSTRAINT "inapp_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "fk_entity_client" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "location_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "location_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "location_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_pincode_id_fkey" FOREIGN KEY ("pincode_id") REFERENCES "pincode_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_level_master" ADD CONSTRAINT "fk_level_client" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "otp_master" ADD CONSTRAINT "otp_master_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_level_id_fkey" FOREIGN KEY ("sku_level_id") REFERENCES "sku_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "physical_rewards_catalogue" ("reward_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_parent_qr_id_fkey" FOREIGN KEY ("parent_qr_id") REFERENCES "qr_codes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "qr_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_bank_transfers" ADD CONSTRAINT "redemption_bank_transfers_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_upi" ADD CONSTRAINT "redemption_upi_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_vouchers" ADD CONSTRAINT "redemption_vouchers_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "redemption_channels" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_status_fkey" FOREIGN KEY ("status") REFERENCES "redemption_statuses" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "schemes" ADD CONSTRAINT "schemes_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "scheme_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "sku_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_level_master" ADD CONSTRAINT "sku_level_master_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_sku_variant_id_fkey" FOREIGN KEY ("sku_variant_id") REFERENCES "sku_variant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_variant" ADD CONSTRAINT "sku_variant_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tds_records" ADD CONSTRAINT "tds_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "third_party_api_logs" ADD CONSTRAINT "third_party_api_logs_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE SET NULL ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "third_party_verification_logs" ADD CONSTRAINT "third_party_verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "ticket_statuses" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ticket_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_cart" ADD CONSTRAINT "cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_orders" ADD CONSTRAINT "amazon_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_wishlist" ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_child_user_id_fkey" FOREIGN KEY ("child_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "user_type_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_parent_type_id_fkey" FOREIGN KEY ("parent_type_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_level_master" ADD CONSTRAINT "user_type_level_master_parent_level_id_fkey" FOREIGN KEY ("parent_level_id") REFERENCES "user_type_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_type_id_fkey" FOREIGN KEY ("onboarding_type_id") REFERENCES "onboarding_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_approval_status_id_fkey" FOREIGN KEY ("approval_status_id") REFERENCES "approval_statuses" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE TYPE "block_status" AS ENUM (
  'basic_registration',
  'phone_number_verified',
  'digilocker',
  'pan_verification',
  'gst_number_verification',
  'bank_account_verified',
  'pending_kyc_verification',
  'profile_updated',
  'none'
);

CREATE TYPE "inventory_type" AS ENUM (
  'inner',
  'outer'
);

CREATE TYPE "notification_channel" AS ENUM (
  'sms',
  'push'
);

CREATE TYPE "notification_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'delivered'
);

CREATE TYPE "notification_trigger_type" AS ENUM (
  'automated',
  'campaign',
  'manual'
);

CREATE TYPE "otp_type" AS ENUM (
  'login',
  'password_reset',
  'registration',
  'kyc'
);

CREATE TABLE "amazon_marketplace_products" (
  "amazon_marketplace_product_id" SERIAL PRIMARY KEY NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "amazon_product_name" text NOT NULL,
  "amazon_model_no" text,
  "amazon_product_description" text,
  "amazon_mrp" numeric(10,2),
  "amazon_discounted_price" numeric(10,2),
  "amazon_csp_on_amazon" numeric(10,2),
  "amazon_inventory_count" integer DEFAULT 0,
  "amazon_points" integer NOT NULL,
  "amazon_diff" numeric(10,2),
  "amazon_url" text,
  "amazon_category" text,
  "amazon_category_image_path" text,
  "amazon_sub_category" text,
  "amazon_sub_category_image_path" text,
  "amazon_product_image_path" text,
  "amazon_comments_vendor" text,
  "is_amz_product_active" boolean DEFAULT true,
  "uploaded_by" integer,
  "uploaded_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "amazon_order_items" (
  "order_item_id" SERIAL PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "asin_sku" text NOT NULL,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "points_per_item" integer NOT NULL,
  "total_points" integer NOT NULL,
  "status" text DEFAULT 'processing',
  "status_history" jsonb DEFAULT ('[]'::jsonb),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "amazon_tickets" (
  "ticket_id" SERIAL PRIMARY KEY NOT NULL,
  "ticket_number" text NOT NULL,
  "order_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "product_id" integer,
  "asin_sku" text,
  "reason" text NOT NULL,
  "request_type" text NOT NULL,
  "status" text DEFAULT 'PENDING',
  "resolution_notes" text,
  "resolved_at" timestamp,
  "resolved_by" integer,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "app_configs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "description" text,
  "updated_by" integer,
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "approval_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "table_name" text NOT NULL,
  "record_id" integer NOT NULL,
  "operation" text NOT NULL,
  "action" text NOT NULL,
  "changed_by" integer,
  "change_source" text,
  "correlation_id" text,
  "old_state" jsonb,
  "new_state" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "campaigns" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "scheme_type" integer NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_active" boolean DEFAULT true,
  "budget" integer DEFAULT 0,
  "spent_budget" integer DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "client" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" text
);

CREATE TABLE "creatives" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type_id" integer NOT NULL,
  "url" varchar(500) NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "carousel_name" text NOT NULL,
  "display_order" integer DEFAULT 0,
  "target_audience" jsonb DEFAULT ('{}'::jsonb),
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "is_active" boolean DEFAULT true,
  "start_date" timestamp,
  "end_date" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "creatives_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "earning_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "event_handler_config" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "event_key" text NOT NULL,
  "handler_name" text NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "event_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "event_id" integer NOT NULL,
  "action" text NOT NULL,
  "event_type" text NOT NULL,
  "entity_id" text,
  "correlation_id" text,
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "event_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "event_key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "template_id" integer
);

CREATE TABLE "inapp_notifications" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "kyc_documents" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "document_type" text NOT NULL,
  "document_value" text NOT NULL,
  "verification_status" text NOT NULL DEFAULT 'pending',
  "verification_result" jsonb,
  "verified_at" timestamp,
  "rejection_reason" text,
  "expiry_date" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "languages" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "ledgers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "redemption_type" integer NOT NULL,
  "amount" numeric NOT NULL,
  "type" text NOT NULL,
  "remarks" text,
  "opening_balance" numeric(18,2) DEFAULT '0',
  "closing_balance" numeric(18,2) DEFAULT '0',
  "last_updated" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "location_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_id" integer NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" text,
  "parent_entity_id" integer
);

CREATE TABLE "location_entity_pincode" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "entity_id" integer NOT NULL,
  "pincode_id" integer NOT NULL
);

CREATE TABLE "location_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "notification_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "channel" notification_channel NOT NULL,
  "template_id" integer,
  "triggerType" notification_trigger_type NOT NULL,
  "status" notification_status DEFAULT 'pending',
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "sent_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notification_templates" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "triggerType" notification_trigger_type NOT NULL DEFAULT 'automated',
  "push_title" text,
  "push_body" text,
  "sms_body" text,
  "sms_dlt_template_id" text,
  "sms_entity_id" text,
  "sms_message_type" text,
  "sms_source_address" text,
  "sms_customer_id" text,
  "placeholders" jsonb DEFAULT ('[]'::jsonb),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer,
  "type" text NOT NULL,
  "channel" text NOT NULL,
  "template_key" text,
  "trigger" text NOT NULL,
  "is_sent" boolean DEFAULT false,
  "sent_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "onboarding_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "otp_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "phone" varchar(20) NOT NULL,
  "otp" text NOT NULL,
  "type" otp_type NOT NULL,
  "user_id" integer,
  "attempts" integer NOT NULL DEFAULT 0,
  "is_used" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "participant_sku_access" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "sku_level_id" integer NOT NULL,
  "sku_entity_id" integer,
  "access_type" varchar(20) DEFAULT 'specific',
  "valid_from" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "valid_to" timestamp,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "physical_rewards_catalogue" (
  "reward_id" SERIAL PRIMARY KEY NOT NULL,
  "reward_name" text NOT NULL,
  "reward_description" text,
  "category" text,
  "points_required" integer NOT NULL,
  "mrp" numeric(10,2),
  "inventory_count" integer DEFAULT 0,
  "image_url" text,
  "brand" text,
  "delivery_time" text DEFAULT '15-21 working days',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "physical_rewards_redemptions" (
  "redemption_id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_request_id" text NOT NULL,
  "user_id" integer NOT NULL,
  "reward_id" integer NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "points_deducted" integer NOT NULL,
  "shipping_address" jsonb NOT NULL,
  "status" text DEFAULT 'PENDING',
  "tracking_number" text,
  "courier_name" text,
  "estimated_delivery" timestamp,
  "delivered_at" timestamp,
  "delivery_proof" text,
  "approved_by" integer,
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "pincode_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "pincode" text NOT NULL,
  "city" text,
  "district" text,
  "state" text,
  "zone" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "qr_codes" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "sku" text NOT NULL,
  "batch_number" text NOT NULL,
  "type_id" integer NOT NULL,
  "code" text NOT NULL,
  "security_code" text NOT NULL,
  "manufacturing_date" timestamp NOT NULL,
  "mono_sub_mono_id" text,
  "parent_qr_id" integer,
  "is_scanned" boolean DEFAULT false,
  "scanned_by" integer,
  "monthly_volume" integer,
  "location_access" jsonb,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "qr_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "redemption_bank_transfers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "account_number" text NOT NULL,
  "ifsc_code" text NOT NULL,
  "account_holder_name" text NOT NULL,
  "bankName" text,
  "razorpay_payout_id" text,
  "razorpay_fund_account_id" text,
  "razorpay_contact_id" text,
  "utr" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemption_channels" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "code" text
);

CREATE TABLE "redemption_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "redemption_upi" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "upi_id" text NOT NULL,
  "razorpay_payout_id" text,
  "razorpay_fund_account_id" text,
  "razorpay_contact_id" text,
  "utr" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemption_vouchers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer NOT NULL,
  "voucher_code" text NOT NULL,
  "voucher_pin" text,
  "platform_voucher_id" text,
  "platform_order_id" text,
  "valid_from" timestamp DEFAULT (now()),
  "valid_until" timestamp,
  "is_redeemed" boolean DEFAULT false,
  "redeemed_at" timestamp,
  "brand" text,
  "denomination" numeric(10,2),
  "txn_id" text,
  "voucher_name" text,
  "rate" numeric(10,2),
  "qty" integer,
  "status" text,
  "txn_time" timestamp,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "redemptions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "redemption_id" text NOT NULL,
  "channel_id" integer NOT NULL,
  "points_redeemed" integer NOT NULL,
  "amount" integer,
  "status" integer NOT NULL,
  "scheme_id" integer,
  "metadata" jsonb NOT NULL,
  "approved_by" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (now()),
  "channel_reference_id" integer
);

CREATE TABLE "referrals" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "referrer_id" integer NOT NULL,
  "referred_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "bonus_awarded" integer DEFAULT 0,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "scheme_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "schemes" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "scheme_type" integer NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_active" boolean DEFAULT true,
  "budget" integer DEFAULT 0,
  "spent_budget" integer DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "sku_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_id" integer NOT NULL,
  "name" varchar(200) NOT NULL,
  "code" text,
  "parent_entity_id" integer,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "sku_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "sku_point_config" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "sku_variant_id" integer NOT NULL,
  "user_type_id" integer NOT NULL,
  "points_per_unit" numeric(10,2) NOT NULL,
  "valid_from" timestamp,
  "valid_to" timestamp,
  "remarks" text,
  "max_scans_per_day" integer DEFAULT 5,
  "is_active" boolean DEFAULT true
);

CREATE TABLE "sku_point_rules" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "priority" integer DEFAULT 0,
  "client_id" integer NOT NULL,
  "location_entity_id" integer,
  "sku_entity_id" integer,
  "sku_variant_id" integer,
  "user_type_id" integer,
  "action_type" varchar(20) NOT NULL,
  "action_value" numeric NOT NULL,
  "is_active" boolean DEFAULT true,
  "valid_from" timestamp,
  "valid_to" timestamp,
  "description" text
);

CREATE TABLE "sku_variant" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "sku_entity_id" integer NOT NULL,
  "variantName" varchar(150) NOT NULL,
  "pack_size" text,
  "mrp" numeric(10,2),
  "is_active" boolean DEFAULT true
);

CREATE TABLE "system_logs" (
  "log_id" SERIAL PRIMARY KEY NOT NULL,
  "log_level" text NOT NULL,
  "component_name" text NOT NULL,
  "message" text NOT NULL,
  "exception_trace" text,
  "action" text NOT NULL,
  "correlation_id" text,
  "api_endpoint" text,
  "user_id" integer,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "tbl_inventory" (
  "inventory_id" SERIAL PRIMARY KEY NOT NULL,
  "serialNumber" varchar(255) NOT NULL,
  "batch_id" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_qr_scanned" boolean NOT NULL DEFAULT false
);

CREATE TABLE "tbl_inventory_batch" (
  "batch_id" SERIAL PRIMARY KEY NOT NULL,
  "skuCode" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "type" inventory_type NOT NULL,
  "fileUrl" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" integer,
  "updated_by" integer,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "tbl_random_keys" (
  "random_key_id" SERIAL PRIMARY KEY NOT NULL,
  "randomKey" varchar(255) NOT NULL,
  "status" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "tds_records" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "financial_year" text NOT NULL,
  "tds_kitty" numeric NOT NULL DEFAULT '0',
  "tds_deducted" numeric NOT NULL DEFAULT '0',
  "reversed_amount" numeric NOT NULL DEFAULT '0',
  "status" text NOT NULL DEFAULT 'active',
  "settled_at" timestamp,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "third_party_api_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "redemption_id" integer,
  "provider" text NOT NULL,
  "api_type" text NOT NULL,
  "api_endpoint" text NOT NULL,
  "http_method" text,
  "request_payload" jsonb,
  "response_payload" jsonb,
  "http_status_code" integer,
  "is_success" boolean,
  "error_message" text,
  "webhook_event_type" text,
  "webhook_signature" text,
  "response_time_ms" integer,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "third_party_verification_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "verification_type" text NOT NULL,
  "provider" text NOT NULL,
  "request_data" jsonb NOT NULL,
  "response_data" jsonb NOT NULL,
  "response_object" jsonb NOT NULL,
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "ticket_statuses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "ticket_types" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "tickets" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type_id" integer NOT NULL,
  "status_id" integer NOT NULL,
  "subject" text,
  "description" text NOT NULL,
  "imageUrl" varchar(500),
  "videoUrl" varchar(500),
  "priority" text DEFAULT 'Medium',
  "assignee_id" integer,
  "created_by" integer NOT NULL,
  "resolution_notes" text,
  "resolved_at" timestamp,
  "attachments" jsonb DEFAULT ('[]'::jsonb),
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "tmp_third_party_verification_logs" (
  "id" text,
  "user_id" text,
  "verification_type" text,
  "provider" text,
  "request_data" text,
  "response_data" text,
  "response_object" text,
  "metadata" text,
  "created_at" text
);

CREATE TABLE "transaction_logs" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "points" numeric NOT NULL,
  "category" text NOT NULL,
  "subcategory" text,
  "sku" text,
  "status" text NOT NULL,
  "batch_number" text,
  "serial_number" text,
  "qr_code" text,
  "remarks" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "metadata" jsonb NOT NULL,
  "scheme_id" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "transactions" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "earning_type" integer NOT NULL,
  "points" numeric NOT NULL,
  "category" text NOT NULL,
  "subcategory" text,
  "sku" text,
  "batch_number" text,
  "serial_number" text,
  "qr_code" text,
  "remarks" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "metadata" jsonb NOT NULL,
  "scheme_id" integer,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_amazon_cart" (
  "cart_id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "added_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_amazon_orders" (
  "user_amz_order_id" SERIAL PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "user_id" integer NOT NULL,
  "redemption_id" text,
  "order_data" jsonb NOT NULL,
  "orderStatus" text DEFAULT 'processing',
  "points_deducted" integer NOT NULL,
  "tds_deducted" integer DEFAULT 0,
  "shipping_details" jsonb,
  "tracking_details" jsonb,
  "estimated_delivery" timestamp,
  "delivered_at" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_amazon_wishlist" (
  "wishlist_id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amazon_asin_sku" text NOT NULL,
  "added_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_associations" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "parent_user_id" integer NOT NULL,
  "child_user_id" integer NOT NULL,
  "association_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "metadata" jsonb DEFAULT ('{}'::jsonb),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_balances" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "unique_id" text,
  "points_balance" numeric(18,2) DEFAULT '0',
  "total_earnings" numeric(18,2) DEFAULT '0',
  "total_balance" numeric(18,2) DEFAULT '0',
  "total_redeemed" numeric(18,2) DEFAULT '0',
  "redeemable_points" numeric(18,2) DEFAULT '0',
  "tds_percentage" integer DEFAULT 0,
  "tds_kitty" numeric(18,2) DEFAULT '0',
  "tds_deducted" numeric(18,2) DEFAULT '0',
  "last_settlement_date" timestamp,
  "is_kyc_verified" boolean DEFAULT false,
  "is_bank_validated" boolean DEFAULT false,
  "sap_customer_code" text,
  "tds_consent" boolean NOT NULL DEFAULT false
);

CREATE TABLE "user_profiles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text,
  "email" text,
  "dob" timestamp,
  "gender" text,
  "city" text,
  "district" text,
  "state" text,
  "pincode" text,
  "aadhaar" text,
  "pan" text,
  "gst" text,
  "shop_name" text,
  "electrician_certificate" text,
  "aadhaar_address" text,
  "address_line_1" text,
  "address_line_2" text,
  "attached_retailer_id" integer,
  "metadata" jsonb DEFAULT ('{}'::jsonb)
);

CREATE TABLE "user_scope_mapping" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_type_id" integer,
  "user_id" integer,
  "scope_type" varchar(20) NOT NULL,
  "scope_level_id" integer NOT NULL,
  "scope_entity_id" integer,
  "access_type" varchar(20) NOT NULL DEFAULT 'specific',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "user_type_entity" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "level_id" integer NOT NULL,
  "type_name" text NOT NULL,
  "parent_type_id" integer,
  "is_active" boolean DEFAULT true,
  "remarks" text,
  "max_daily_scans" integer DEFAULT 50,
  "required_kyc_level" text DEFAULT 'Basic',
  "allowed_redemption_channels" jsonb DEFAULT ('[]'::jsonb),
  "is_referral_enabled" boolean DEFAULT true,
  "referral_reward_points" integer DEFAULT 0,
  "referee_reward_points" integer DEFAULT 0,
  "max_referrals" integer DEFAULT 10,
  "referral_code_prefix" text,
  "referral_validity_days" integer,
  "referral_success_message" text
);

CREATE TABLE "user_type_level_master" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "level_no" integer NOT NULL,
  "level_name" text NOT NULL,
  "parent_level_id" integer
);

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "role_id" integer NOT NULL,
  "name" text,
  "phone" text NOT NULL,
  "email" text,
  "password" text,
  "pin" text,
  "location" jsonb,
  "referral_code" text,
  "referrer_id" integer,
  "onboarding_type_id" integer NOT NULL,
  "approval_status_id" integer NOT NULL,
  "language_id" integer NOT NULL DEFAULT 1,
  "is_suspended" boolean DEFAULT false,
  "suspended_at" timestamp,
  "fcm_token" text,
  "last_login_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "block_status" block_status DEFAULT 'basic_registration',
  "profile_photo_url" text
);

CREATE UNIQUE INDEX "amazon_asin_sku_unique" ON "amazon_marketplace_products" USING BTREE ("amazon_asin_sku");

CREATE UNIQUE INDEX "amazon_tickets_ticket_number_unique" ON "amazon_tickets" ("ticket_number");

CREATE UNIQUE INDEX "app_configs_key_key" ON "app_configs" ("key");

CREATE UNIQUE INDEX "approval_statuses_name_key" ON "approval_statuses" ("name");

CREATE UNIQUE INDEX "client_code_key" ON "client" ("code");

CREATE UNIQUE INDEX "creatives_types_name_key" ON "creatives_types" ("name");

CREATE UNIQUE INDEX "earning_types_name_key" ON "earning_types" ("name");

CREATE UNIQUE INDEX "event_handler_config_event_handler_key" ON "event_handler_config" USING BTREE ("event_key", "handler_name");

CREATE UNIQUE INDEX "event_master_event_key_key" ON "event_master" ("event_key");

CREATE UNIQUE INDEX "event_master_name_key" ON "event_master" ("name");

CREATE UNIQUE INDEX "kyc_documents_user_id_type_key" ON "kyc_documents" ("user_id", "document_type");

CREATE UNIQUE INDEX "languages_name_key" ON "languages" ("name");

CREATE UNIQUE INDEX "ledgers_user_id_key" ON "ledgers" ("user_id");

CREATE UNIQUE INDEX "notification_templates_slug_unique" ON "notification_templates" ("slug");

CREATE UNIQUE INDEX "onboarding_types_name_key" ON "onboarding_types" ("name");

CREATE UNIQUE INDEX "participant_sku_access_user_id_sku_level_id_sku_entity_id_key" ON "participant_sku_access" ("user_id", "sku_level_id", "sku_entity_id");

CREATE UNIQUE INDEX "physical_rewards_redemptions_redemption_request_id_unique" ON "physical_rewards_redemptions" ("redemption_request_id");

CREATE UNIQUE INDEX "pincode_master_pincode_key" ON "pincode_master" ("pincode");

CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes" ("code");

CREATE UNIQUE INDEX "qr_types_name_key" ON "qr_types" ("name");

CREATE UNIQUE INDEX "redemption_bank_transfers_redemption_id_unique" ON "redemption_bank_transfers" ("redemption_id");

CREATE UNIQUE INDEX "redemption_channels_name_key" ON "redemption_channels" ("name");

CREATE UNIQUE INDEX "redemption_channels_code_unique" ON "redemption_channels" ("code");

CREATE UNIQUE INDEX "redemption_statuses_name_key" ON "redemption_statuses" ("name");

CREATE UNIQUE INDEX "redemption_upi_redemption_id_unique" ON "redemption_upi" ("redemption_id");

CREATE UNIQUE INDEX "redemptions_redemption_id_key" ON "redemptions" ("redemption_id");

CREATE UNIQUE INDEX "scheme_types_name_key" ON "scheme_types" ("name");

CREATE UNIQUE INDEX "uq_client_level" ON "sku_level_master" USING BTREE ("client_id", "level_no");

CREATE UNIQUE INDEX "uq_sku_user_type" ON "sku_point_config" USING BTREE ("client_id", "sku_variant_id", "user_type_id");

CREATE UNIQUE INDEX "tbl_inventory_serial_number_unique" ON "tbl_inventory" ("serialNumber");

CREATE UNIQUE INDEX "tbl_random_keys_random_key_unique" ON "tbl_random_keys" ("randomKey");

CREATE UNIQUE INDEX "tds_records_user_id_fy_key" ON "tds_records" ("user_id", "financial_year");

CREATE UNIQUE INDEX "ticket_statuses_name_key" ON "ticket_statuses" ("name");

CREATE UNIQUE INDEX "ticket_types_name_key" ON "ticket_types" ("name");

CREATE UNIQUE INDEX "user_cart_unique" ON "user_amazon_cart" USING BTREE ("user_id", "amazon_asin_sku");

CREATE UNIQUE INDEX "user_amazon_orders_order_id_unique" ON "user_amazon_orders" ("order_id");

CREATE UNIQUE INDEX "user_wishlist_unique" ON "user_amazon_wishlist" USING BTREE ("user_id", "amazon_asin_sku");

CREATE UNIQUE INDEX "user_associations_parent_child_type_key" ON "user_associations" ("parent_user_id", "child_user_id", "association_type");

CREATE UNIQUE INDEX "user_balances_user_id_unique" ON "user_balances" ("user_id");

CREATE UNIQUE INDEX "user_balances_unique_id_unique" ON "user_balances" ("unique_id");

CREATE UNIQUE INDEX "user_balances_user_id_key" ON "user_balances" ("user_id");

CREATE UNIQUE INDEX "user_profiles_user_id_unique" ON "user_profiles" ("user_id");

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles" ("user_id");

CREATE UNIQUE INDEX "user_scope_mapping_unique" ON "user_scope_mapping" USING BTREE ("user_type_id", "user_id", "scope_type", "scope_level_id", "scope_entity_id");

CREATE UNIQUE INDEX "users_phone_key" ON "users" ("phone");

CREATE UNIQUE INDEX "users_referral_code_key" ON "users" ("referral_code");

CREATE UNIQUE INDEX "users_email_unique_not_null" ON "users" USING BTREE ("email");

ALTER TABLE "amazon_marketplace_products" ADD CONSTRAINT "amazon_products_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "user_amazon_orders" ("user_amz_order_id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "amazon_marketplace_products" ("amazon_marketplace_product_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "user_amazon_orders" ("user_amz_order_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amazon_tickets" ADD CONSTRAINT "tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "app_configs" ADD CONSTRAINT "app_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "scheme_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "creatives" ADD CONSTRAINT "creatives_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "creatives_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_master" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "event_master" ADD CONSTRAINT "event_master_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inapp_notifications" ADD CONSTRAINT "inapp_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "fk_entity_client" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "location_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity" ADD CONSTRAINT "location_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "location_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "location_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_entity_pincode" ADD CONSTRAINT "location_entity_pincode_pincode_id_fkey" FOREIGN KEY ("pincode_id") REFERENCES "pincode_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_level_master" ADD CONSTRAINT "fk_level_client" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "otp_master" ADD CONSTRAINT "otp_master_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_sku_level_id_fkey" FOREIGN KEY ("sku_level_id") REFERENCES "sku_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participant_sku_access" ADD CONSTRAINT "participant_sku_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "physical_rewards_redemptions" ADD CONSTRAINT "physical_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "physical_rewards_catalogue" ("reward_id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_parent_qr_id_fkey" FOREIGN KEY ("parent_qr_id") REFERENCES "qr_codes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "qr_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_bank_transfers" ADD CONSTRAINT "redemption_bank_transfers_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_upi" ADD CONSTRAINT "redemption_upi_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemption_vouchers" ADD CONSTRAINT "redemption_vouchers_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "redemption_channels" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_status_fkey" FOREIGN KEY ("status") REFERENCES "redemption_statuses" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "schemes" ADD CONSTRAINT "schemes_scheme_type_fkey" FOREIGN KEY ("scheme_type") REFERENCES "scheme_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "sku_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_entity" ADD CONSTRAINT "sku_entity_parent_entity_id_fkey" FOREIGN KEY ("parent_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_level_master" ADD CONSTRAINT "sku_level_master_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_sku_variant_id_fkey" FOREIGN KEY ("sku_variant_id") REFERENCES "sku_variant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_point_config" ADD CONSTRAINT "sku_point_config_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sku_variant" ADD CONSTRAINT "sku_variant_sku_entity_id_fkey" FOREIGN KEY ("sku_entity_id") REFERENCES "sku_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tds_records" ADD CONSTRAINT "tds_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "third_party_api_logs" ADD CONSTRAINT "third_party_api_logs_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions" ("id") ON DELETE SET NULL ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "third_party_verification_logs" ADD CONSTRAINT "third_party_verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "ticket_statuses" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ticket_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_cart" ADD CONSTRAINT "cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_orders" ADD CONSTRAINT "amazon_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_amazon_wishlist" ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_child_user_id_fkey" FOREIGN KEY ("child_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_associations" ADD CONSTRAINT "user_associations_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scope_mapping" ADD CONSTRAINT "user_scope_mapping_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "user_type_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_entity" ADD CONSTRAINT "user_type_entity_parent_type_id_fkey" FOREIGN KEY ("parent_type_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_type_level_master" ADD CONSTRAINT "user_type_level_master_parent_level_id_fkey" FOREIGN KEY ("parent_level_id") REFERENCES "user_type_level_master" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "user_type_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_type_id_fkey" FOREIGN KEY ("onboarding_type_id") REFERENCES "onboarding_types" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_approval_status_id_fkey" FOREIGN KEY ("approval_status_id") REFERENCES "approval_statuses" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD CONSTRAINT "users_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
