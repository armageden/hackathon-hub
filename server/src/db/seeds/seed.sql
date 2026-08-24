-- Seed data for hackathon_hub
-- Passwords:
--   admin@hackathon.com -> admin123
--   user@hackathon.com  -> user123

-- Admin user
INSERT INTO users (id, email, password_hash, full_name, global_role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@hackathon.com',
  '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6',
  'Farhan Ahmed',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Regular user
INSERT INTO users (id, email, password_hash, full_name, global_role)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'user@hackathon.com',
  '$2a$12$aHuKsazJmgdbH/pDFu7cFe1daMSNkIrc/SdlN7SWVibHR6gNY9VaO',
  'Sarah Chen',
  'user'
) ON CONFLICT (email) DO NOTHING;

-- Sample event
INSERT INTO events (id, name, slug, description, starts_at, ends_at, status, created_by)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'Hackathon 2026',
  'hackathon-2026',
  'Annual hackathon event for developers and innovators.',
  '2026-09-01 09:00:00+00',
  '2026-09-03 18:00:00+00',
  'active',
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (slug) DO NOTHING;

-- Admin as organizer of the event
INSERT INTO event_members (event_id, user_id, role, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'organizer',
  'active'
) ON CONFLICT (event_id, user_id) DO NOTHING;

-- Regular user as participant
INSERT INTO event_members (event_id, user_id, role, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'participant',
  'active'
) ON CONFLICT (event_id, user_id) DO NOTHING;

-- Sample hardware items
INSERT INTO hardware_items (id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes)
VALUES 
  (
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Arduino Uno R3',
    'Microcontrollers',
    'A000066',
    'ARD-UNO-001',
    10,
    'new',
    'available',
    'Shelf A-1',
    'Standard Arduino Uno boards for prototyping'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'Raspberry Pi 4 Model B (4GB)',
    'Microcontrollers',
    'RPI4-MODBP-4GB',
    'RPI4-001',
    5,
    'new',
    'available',
    'Shelf A-2',
    'Raspberry Pi 4 with 4GB RAM for advanced projects'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'DHT22 Temperature & Humidity Sensor',
    'Sensors',
    'DHT22',
    'DHT22-001',
    20,
    'good',
    'available',
    'Shelf B-1',
    'Digital temperature and humidity sensor'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000001',
    'HC-SR04 Ultrasonic Distance Sensor',
    'Sensors',
    'HC-SR04',
    'HCSR04-001',
    15,
    'good',
    'available',
    'Shelf B-2',
    'Ultrasonic ranging module for distance measurement'
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000001',
    'SG90 Micro Servo Motor',
    'Actuators',
    'SG90',
    'SG90-001',
    25,
    'fair',
    'available',
    'Shelf C-1',
    'Micro servo motor for robotics projects'
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000001',
    '0.96" I2C OLED Display',
    'Displays',
    'SSD1306',
    'OLED-001',
    12,
    'new',
    'available',
    'Shelf C-2',
    '0.96 inch I2C OLED display module'
  ),
  (
    'a0000000-0000-0000-0000-000000000007',
    'e0000000-0000-0000-0000-000000000001',
    'ESP8266 WiFi Module',
    'Communication',
    'ESP-01',
    'ESP8266-001',
    15,
    'good',
    'available',
    'Shelf D-1',
    'ESP8266 WiFi module for IoT projects'
  ),
  (
    'a0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000001',
    'Breadboard Power Supply Module',
    'Power',
    'MB102',
    'MB102-001',
    8,
    'new',
    'available',
    'Shelf D-2',
    '3.3V/5V breadboard power supply module'
  ),
  (
    'a0000000-0000-0000-0000-000000000009',
    'e0000000-0000-0000-0000-000000000001',
    'Jumper Wire Kit (120pcs)',
    'Cables & Connectors',
    'JMP-120',
    'JMP-001',
    3,
    'fair',
    'available',
    'Shelf E-1',
    'Assorted jumper wires for breadboarding'
  ),
  (
    'a0000000-0000-0000-0000-000000000010',
    'e0000000-0000-0000-0000-000000000001',
    'Arduino Starter Kit',
    'Kits',
    'ARK001',
    'ARK-001',
    2,
    'new',
    'available',
    'Shelf F-1',
    'Complete Arduino starter kit with components and guide'
  ) ON CONFLICT (id) DO NOTHING;
