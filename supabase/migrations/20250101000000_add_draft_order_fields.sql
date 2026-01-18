-- Add items JSONB field to orders table for storing cart items temporarily
-- This will be used to store the cart data before it gets normalized into order_items
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add user_id column for draft orders (before customer confirmation)
-- NOTE: customer_id is used for confirmed orders, user_id for drafts
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- Update status enum to include 'draft' status for orders in progress
-- We'll handle this by checking if the type exists first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel='draft' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'order_status'
        )
    ) THEN
        ALTER TYPE order_status ADD VALUE 'draft' BEFORE 'new';
    END IF;
END $$;

-- Add index for user_id for faster queries
CREATE INDEX IF  NOT EXISTS idx_orders_user_id 
  ON public.orders(user_id);

-- Add policy to allow users to create their own draft orders
-- Add index for user_id for faster queries
CREATE INDEX IF  NOT EXISTS idx_orders_user_id 
  ON public.orders(user_id);
