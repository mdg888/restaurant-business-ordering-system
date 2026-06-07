-- ============================================================
-- MIGRATION 003: Seed Data (sample menu)
-- ============================================================

-- Categories
INSERT INTO menu_categories (id, name, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Starters',    1),
  ('11111111-0000-0000-0000-000000000002', 'Mains',       2),
  ('11111111-0000-0000-0000-000000000003', 'Sides',       3),
  ('11111111-0000-0000-0000-000000000004', 'Desserts',    4),
  ('11111111-0000-0000-0000-000000000005', 'Drinks',      5)
ON CONFLICT DO NOTHING;

-- Menu Items (prices in cents)
INSERT INTO menu_items (id, category_id, name, description, price_cents, sort_order) VALUES
  -- Starters
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Garlic Bread',       'Toasted sourdough with garlic butter',         800,  1),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Calamari',           'Crispy fried squid with aioli',                1400, 2),

  -- Mains
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
   'Cheeseburger',       'Beef patty, cheddar, lettuce, tomato, pickles', 1800, 1),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002',
   'Grilled Salmon',     'Atlantic salmon with seasonal vegetables',      2600, 2),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002',
   'Margherita Pizza',   '12" pizza with tomato, mozzarella, basil',      2200, 3),

  -- Sides
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003',
   'Fries',              'Crispy golden fries with sea salt',              700,  1),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003',
   'Side Salad',         'Mixed greens with house dressing',               900,  2),

  -- Desserts
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004',
   'Chocolate Lava Cake','Warm chocolate cake with vanilla ice cream',    1200, 1),
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000004',
   'Cheesecake',         'New York style with berry coulis',              1100, 2),

  -- Drinks
  ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005',
   'Soft Drink',         'Coke, Sprite, or Fanta',                        500,  1),
  ('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000005',
   'Fresh Juice',        'Orange, apple, or watermelon',                  800,  2),
  ('22222222-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000005',
   'Sparkling Water',    '500ml',                                          400,  3)
ON CONFLICT DO NOTHING;

-- Modifiers for Cheeseburger
INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents) VALUES
  ('22222222-0000-0000-0000-000000000003', 'Extra Cheese',   150),
  ('22222222-0000-0000-0000-000000000003', 'Bacon',          250),
  ('22222222-0000-0000-0000-000000000003', 'Gluten Free Bun', 200)
ON CONFLICT DO NOTHING;

-- Modifiers for Fries
INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents) VALUES
  ('22222222-0000-0000-0000-000000000006', 'Loaded (cheese + bacon)', 400),
  ('22222222-0000-0000-0000-000000000006', 'Truffle & Parmesan',      350)
ON CONFLICT DO NOTHING;
