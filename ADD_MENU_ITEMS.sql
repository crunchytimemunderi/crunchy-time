-- Add default menu items for Crunchy Times
-- Run this in Supabase SQL Editor

-- First, check if menu_items table exists
-- If not, create it
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some default menu items (only if they don't exist)
INSERT INTO menu_items (name, price)
SELECT * FROM (VALUES
  ('Fried Chicken - Regular', 120.00),
  ('Fried Chicken - Large', 180.00),
  ('Chicken Wings - 6pcs', 150.00),
  ('Chicken Wings - 12pcs', 280.00),
  ('Chicken Burger', 80.00),
  ('Chicken Wrap', 90.00),
  ('French Fries - Small', 40.00),
  ('French Fries - Large', 60.00),
  ('Chicken Nuggets - 6pcs', 100.00),
  ('Chicken Nuggets - 12pcs', 180.00),
  ('Chicken Popcorn', 70.00),
  ('Coke', 30.00),
  ('Pepsi', 30.00),
  ('Sprite', 30.00),
  ('Water Bottle', 20.00)
) AS v(name, price)
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE menu_items.name = v.name
);

-- Verify the data was added
SELECT * FROM menu_items ORDER BY name;
