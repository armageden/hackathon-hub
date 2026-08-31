-- Showcase dataset for the REAL event ("Hackathon 2026",
-- e0000000-0000-0000-0000-000000000001) — rich, business-rule-valid data for
-- the faculty showcase, complementing the base seed.sql.
--
-- Conventions (mirrors seed.sql / demo-seed.sql):
--   * Fixed UUIDs; every showcase row id starts with c0000000-0000-0000-0000-...
--   * Every INSERT ends with ON CONFLICT ... DO NOTHING, so this file is safe
--     to re-run.
--   * Pre-existing users from seed.sql are reused, never re-inserted:
--       a0000000-0000-0000-0000-000000000001 -> admin@hackathon.com (admin, organizer)
--       a0000000-0000-0000-0000-000000000002 -> user@hackathon.com  (user, participant)
--
-- ALL showcase accounts share the password "admin123" (same bcrypt hash as
-- admin@hackathon.com) so every role can be demoed by logging in directly:
--   judge1@showcase.dev / judge2@showcase.dev                      -> judges
--   vol1@showcase.dev  / vol2@showcase.dev                         -> volunteers
--   rafi@ / nafis@ / priya@ / zara@ / omar@ / laila@ / imran@       -> participants
--     (@showcase.dev each)

-- ---------------------------------------------------------------------------
-- Users (001: UNIQUE(email))
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, global_role) VALUES
  ('c0000000-0000-0000-0000-000000000041', 'judge1@showcase.dev', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Dr. Nusrat Jahan', 'user'),
  ('c0000000-0000-0000-0000-000000000042', 'judge2@showcase.dev', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Rezaul Karim',    'user'),
  ('c0000000-0000-0000-0000-000000000043', 'vol1@showcase.dev',   '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Tanvir Hasan',    'user'),
  ('c0000000-0000-0000-0000-000000000044', 'vol2@showcase.dev',   '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Mina Akter',      'user'),
  ('c0000000-0000-0000-0000-000000000045', 'rafi@showcase.dev',   '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Rafi Ahmed',      'user'),
  ('c0000000-0000-0000-0000-000000000046', 'nafis@showcase.dev',  '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Nafis Iqbal',     'user'),
  ('c0000000-0000-0000-0000-000000000047', 'priya@showcase.dev',  '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Priya Saha',      'user'),
  ('c0000000-0000-0000-0000-000000000048', 'zara@showcase.dev',   '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Zara Chowdhury',  'user'),
  ('c0000000-0000-0000-0000-000000000049', 'omar@showcase.dev',   '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Omar Farooq',     'user'),
  ('c0000000-0000-0000-0000-000000000050', 'laila@showcase.dev',  '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Laila Islam',     'user'),
  ('c0000000-0000-0000-0000-000000000051', 'imran@showcase.dev',  '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'Imran Hossain',   'user')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Event members (003: UNIQUE(event_id, user_id))
-- ---------------------------------------------------------------------------
INSERT INTO event_members (event_id, user_id, role, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'organizer',   'active'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000041', 'judge',       'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000042', 'judge',       'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000043', 'volunteer',   'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000044', 'volunteer',   'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000045', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000046', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000047', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000048', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000049', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000050', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000051', 'participant', 'active')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Participant profiles (003: UNIQUE(event_id, user_id))
-- ---------------------------------------------------------------------------
INSERT INTO participant_profiles (id, event_id, user_id, bio, experience_level, preferred_role, looking_for_team, tech_stack_summary) VALUES
  ('c0000000-0000-0000-0000-000000000061', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Full-stack developer who loves shipping fast at hackathons.', 'intermediate', 'Backend Developer', false, 'Node.js, PostgreSQL, React'),
  ('c0000000-0000-0000-0000-000000000062', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000045', 'Team lead; competitive programmer and IoT enthusiast.', 'advanced', 'Team Lead', false, 'C++, Python, React Native'),
  ('c0000000-0000-0000-0000-000000000063', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000046', 'Embedded systems tinkerer; loves blinking everything.', 'intermediate', 'Firmware Engineer', false, 'C, ESP32, MQTT'),
  ('c0000000-0000-0000-0000-000000000064', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000047', 'Frontend developer with an eye for clean UI.', 'intermediate', 'Frontend Developer', false, 'React, TypeScript, Tailwind CSS'),
  ('c0000000-0000-0000-0000-000000000065', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000048', 'ML student; Kaggle semi-finalist.', 'advanced', 'ML Engineer', false, 'Python, TensorFlow, FastAPI'),
  ('c0000000-0000-0000-0000-000000000066', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000049', 'Mobile-first developer; ships Flutter apps.', 'beginner', 'Mobile Developer', false, 'Flutter, Firebase, Dart'),
  ('c0000000-0000-0000-0000-000000000067', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000050', 'Hardware hacker and circuit designer.', 'advanced', 'Hardware Lead', false, 'KiCad, Arduino, Soldering'),
  ('c0000000-0000-0000-0000-000000000068', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000051', 'First-time hacker looking for a team to join.', 'beginner', 'Frontend Developer', true, 'JavaScript, HTML, CSS')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Tech stack tags (003: UNIQUE(name)) + links (composite PK)
INSERT INTO tech_stack_tags (id, name, category) VALUES
  ('c0000000-0000-0000-0000-000000000071', 'React',        'Frontend'),
  ('c0000000-0000-0000-0000-000000000072', 'Node.js',      'Backend'),
  ('c0000000-0000-0000-0000-000000000073', 'PostgreSQL',   'Database'),
  ('c0000000-0000-0000-0000-000000000074', 'Python',       'Language'),
  ('c0000000-0000-0000-0000-000000000075', 'TensorFlow',   'ML'),
  ('c0000000-0000-0000-0000-000000000076', 'Flutter',      'Mobile'),
  ('c0000000-0000-0000-0000-000000000077', 'ESP32',        'Embedded'),
  ('c0000000-0000-0000-0000-000000000078', 'Tailwind CSS', 'Frontend')
ON CONFLICT (name) DO NOTHING;

INSERT INTO participant_tech_stack (participant_profile_id, tech_stack_tag_id) VALUES
  ('c0000000-0000-0000-0000-000000000061', 'c0000000-0000-0000-0000-000000000072'),
  ('c0000000-0000-0000-0000-000000000061', 'c0000000-0000-0000-0000-000000000073'),
  ('c0000000-0000-0000-0000-000000000061', 'c0000000-0000-0000-0000-000000000071'),
  ('c0000000-0000-0000-0000-000000000062', 'c0000000-0000-0000-0000-000000000074'),
  ('c0000000-0000-0000-0000-000000000063', 'c0000000-0000-0000-0000-000000000077'),
  ('c0000000-0000-0000-0000-000000000064', 'c0000000-0000-0000-0000-000000000071'),
  ('c0000000-0000-0000-0000-000000000064', 'c0000000-0000-0000-0000-000000000078'),
  ('c0000000-0000-0000-0000-000000000065', 'c0000000-0000-0000-0000-000000000074'),
  ('c0000000-0000-0000-0000-000000000065', 'c0000000-0000-0000-0000-000000000075'),
  ('c0000000-0000-0000-0000-000000000066', 'c0000000-0000-0000-0000-000000000076')
ON CONFLICT (participant_profile_id, tech_stack_tag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teams (004) — three squads plus one pending application so the
-- team-application workflow has something to approve live.
-- ---------------------------------------------------------------------------
INSERT INTO teams (id, event_id, name, description, max_size, status, created_by) VALUES
  ('c0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000001', 'CodeForge',      'Asset-tracking platform with QR checkouts.', 5, 'full',    'c0000000-0000-0000-0000-000000000045'),
  ('c0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000001', 'PixelPioneers',  'IoT safety monitor for real-world spaces.',  5, 'full',    'c0000000-0000-0000-0000-000000000048'),
  ('c0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000001', 'CircuitSages',   'Smart queue management for campus services.', 5, 'forming', 'c0000000-0000-0000-0000-000000000050')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role, assigned_by, joined_at) VALUES
  ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000045', 'owner',  'c0000000-0000-0000-0000-000000000045', '2026-08-28 10:00:00+00'),
  ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000046', 'member', 'c0000000-0000-0000-0000-000000000045', '2026-08-28 12:30:00+00'),
  ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000047', 'member', 'c0000000-0000-0000-0000-000000000045', '2026-08-29 09:15:00+00'),
  ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000048', 'owner',  'c0000000-0000-0000-0000-000000000048', '2026-08-28 14:00:00+00'),
  ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000049', 'member', 'c0000000-0000-0000-0000-000000000048', '2026-08-29 11:20:00+00'),
  ('c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000050', 'owner',  'c0000000-0000-0000-0000-000000000050', '2026-08-30 16:00:00+00'),
  ('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'member', 'c0000000-0000-0000-0000-000000000050', '2026-08-31 10:10:00+00')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Pending application from Imran (profile 068) to CodeForge
INSERT INTO team_applications (id, team_id, participant_profile_id, message, status) VALUES
  ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000068', 'Hi! I do React frontends and I am looking for a team — happy to take the dashboard.', 'pending')
ON CONFLICT (team_id, participant_profile_id, status) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Hardware inventory (005). Status mix: 6 available, 2 checked_out (qty 0),
-- 1 damaged (qty 0), 1 retired (qty 0).
-- ---------------------------------------------------------------------------
INSERT INTO hardware_items (id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Arduino Uno R3',                'Microcontrollers', 'A000066',        'SHOW-ARD-01',  8, 'new',        'available',   'Shelf A-1',    'Standard Uno boards for prototyping.'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Raspberry Pi 5 (8GB)',           'Microcontrollers', 'SC1111',         'SHOW-RPI-01',  0, 'good',       'checked_out', 'Cabinet B-2',  '8GB RAM Pi 5 with active cooler.'),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'ESP32-S3 DevKitC-1',             'Microcontrollers', 'ESP32-S3-DEV',   'SHOW-ESP-01', 12, 'new',        'available',   'Shelf A-2',    'WiFi/BLE microcontroller with USB-OTG.'),
  ('c0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Jetson Orin Nano Dev Kit',       'AI Accelerators',  '945-13766-0005', 'SHOW-JET-01',  0, 'good',       'checked_out', 'Cabinet B-1',  'Edge-AI kit for computer-vision projects.'),
  ('c0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'Rigol DS1102Z-E Oscilloscope',   'Test Equipment',   'DS1102Z-E',      'SHOW-SCOPE-01',2, 'good',       'available',   'Bench D-1',    '100MHz 2-channel digital scope.'),
  ('c0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'TF-Luna LiDAR Module',           'Sensors',          'TF-Luna',        'SHOW-LIDAR-01',5, 'new',        'available',   'Shelf B-1',    '8m ranging LiDAR, UART/I2C. One unit out on an overdue checkout.'),
  ('c0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', 'Weller WE1010 Soldering Station','Tools',            'WE1010',         'SHOW-SOLD-01', 5, 'fair',       'available',   'Bench D-2',    '70W station; tips in drawer below.'),
  ('c0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 'Bambu Lab A1 mini 3D Printer',   'Fabrication',      'A1-mini',        'SHOW-3DP-01',  0, 'damaged',    'damaged',     'Maker Corner', 'Out of service pending repair (see damage report).'),
  ('c0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000001', 'Meta Quest 3 VR Headset',        'Peripherals',      'MQ3-128',        'SHOW-VR-01',   2, 'good',       'available',   'Cabinet B-3',  'Standalone VR headset, charger included.'),
  ('c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000001', 'GPS NEO-6M Module',              'Sensors',          'NEO-6M',         'SHOW-GPS-01',  0, 'poor',       'retired',     'E-Waste Bin',  'Retired: antenna connector broken.')
ON CONFLICT (id) DO NOTHING;

-- One TF-Luna unit is out on the overdue checkout (see checkouts below), so
-- shelf quantity reflects 5, not 6.
UPDATE hardware_items SET quantity_available = 5
WHERE id = 'c0000000-0000-0000-0000-000000000006';

-- Checkouts (005): two active during the event, one overdue (relative dates so
-- analytics always flags it), two already returned.
INSERT INTO hardware_checkouts (id, event_id, hardware_item_id, borrower_user_id, checked_out_by, checked_out_at, due_at, status, notes) VALUES
  ('c0000000-0000-0000-0000-000000000081', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000001', '2026-09-01 10:30:00+00', '2026-09-02 18:00:00+00', 'active',   'CampusCart core controller.'),
  ('c0000000-0000-0000-0000-000000000082', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000001', '2026-09-01 11:00:00+00', '2026-09-03 12:00:00+00', 'active',   'Vision inference box for SafeSitter.'),
  ('c0000000-0000-0000-0000-000000000083', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days', 'overdue', 'Borrowed for pre-event testing; reminder sent, not yet returned.'),
  ('c0000000-0000-0000-0000-000000000084', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000001', '2026-09-01 09:40:00+00', '2026-09-01 20:00:00+00', 'returned', NULL),
  ('c0000000-0000-0000-0000-000000000085', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000001', '2026-09-02 13:00:00+00', '2026-09-03 10:00:00+00', 'returned', 'VR demo rehearsal.')
ON CONFLICT (id) DO NOTHING;

-- Returns (005): condition + received_by per PRD
INSERT INTO hardware_returns (id, checkout_id, returned_at, condition, received_by, notes) VALUES
  ('c0000000-0000-0000-0000-000000000086', 'c0000000-0000-0000-0000-000000000084', '2026-09-01 19:05:00+00', 'good', 'a0000000-0000-0000-0000-000000000001', 'Returned on time, all pins straight.'),
  ('c0000000-0000-0000-0000-000000000087', 'c0000000-0000-0000-0000-000000000085', '2026-09-02 16:40:00+00', 'fair', 'a0000000-0000-0000-0000-000000000001', 'Facial padding slightly worn.')
ON CONFLICT (id) DO NOTHING;

-- Damage report (012 added created_at DEFAULT NOW())
INSERT INTO hardware_damage_reports (id, event_id, hardware_item_id, checkout_id, reported_by, description, severity, status) VALUES
  ('c0000000-0000-0000-0000-000000000088', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', NULL, 'a0000000-0000-0000-0000-000000000001', 'Heated bed thermistor reads intermittent and the tool head homing fails after the build-plate crash; printer pulled from service.', 'major', 'open')
ON CONFLICT (id) DO NOTHING;

-- Audit trail (status_change entries render in the item timelines; format
-- mirrors hardware.repository.ts logStatusChange)
INSERT INTO audit_logs (id, event_id, user_id, action, entity_type, entity_id, old_values, new_values, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000091', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000002', '{"status": "available", "condition": "good"}',  '{"status": "checked_out", "condition": "good"}',  '2026-09-01 10:30:00+00'),
  ('c0000000-0000-0000-0000-000000000092', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000004', '{"status": "available", "condition": "good"}',  '{"status": "checked_out", "condition": "good"}',  '2026-09-01 11:00:00+00'),
  ('c0000000-0000-0000-0000-000000000093', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000001', '{"status": "checked_out", "condition": "new"}', '{"status": "available", "condition": "good"}',    '2026-09-01 19:05:00+00'),
  ('c0000000-0000-0000-0000-000000000094', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000008', '{"status": "available", "condition": "good"}',  '{"status": "damaged", "condition": "damaged"}',   '2026-09-02 15:20:00+00'),
  ('c0000000-0000-0000-0000-000000000095', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000010', '{"status": "available", "condition": "poor"}',  '{"status": "retired", "condition": "poor"}',      '2026-08-30 09:00:00+00'),
  ('c0000000-0000-0000-0000-000000000096', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'status_change', 'hardware_item', 'c0000000-0000-0000-0000-000000000009', '{"status": "checked_out", "condition": "good"}','{"status": "available", "condition": "good"}',    '2026-09-02 16:40:00+00')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Itinerary (006) — real event runs 2026-09-01 09:00 -> 2026-09-03 18:00
-- ---------------------------------------------------------------------------
INSERT INTO itinerary_items (id, event_id, title, description, location, starts_at, ends_at, session_type) VALUES
  ('c0000000-0000-0000-0000-000000000031', 'e0000000-0000-0000-0000-000000000001', 'Check-in & Registration',        'Grab your badge, swag bag, and team wristband.',            'Main Hall',       '2026-09-01 08:00:00+00', '2026-09-01 09:30:00+00', 'general'),
  ('c0000000-0000-0000-0000-000000000032', 'e0000000-0000-0000-0000-000000000001', 'Opening Ceremony & Keynote',     'Welcome talk, rules walkthrough, and sponsor keynote.',     'Main Hall',       '2026-09-01 10:00:00+00', '2026-09-01 11:30:00+00', 'ceremony'),
  ('c0000000-0000-0000-0000-000000000033', 'e0000000-0000-0000-0000-000000000001', 'Workshop: Edge AI on Jetson',    'Hands-on session covering vision models on Jetson Orin.',   'Workshop Room A', '2026-09-01 13:00:00+00', '2026-09-01 15:00:00+00', 'workshop'),
  ('c0000000-0000-0000-0000-000000000034', 'e0000000-0000-0000-0000-000000000001', 'Lunch Break & Team Photos',      'Buffet lunch plus team photo round on the stage.',          'Lounge',          '2026-09-02 12:00:00+00', '2026-09-02 13:30:00+00', 'general'),
  ('c0000000-0000-0000-0000-000000000035', 'e0000000-0000-0000-0000-000000000001', 'Overnight Hacking Block',        'Quiet-hours build sprint; mentors on call all night.',      'Main Hall',       '2026-09-02 14:00:00+00', '2026-09-03 08:00:00+00', 'general'),
  ('c0000000-0000-0000-0000-000000000036', 'e0000000-0000-0000-0000-000000000001', 'Project Demos & Awards Ceremony','Three-minute demos per team, judging deliberation, prizes.','Main Hall',       '2026-09-03 15:00:00+00', '2026-09-03 18:00:00+00', 'presentation')
ON CONFLICT (id) DO NOTHING;

-- Check-ins (006: PK(id) only)
INSERT INTO check_ins (id, event_id, user_id, itinerary_item_id, method, checked_in_by, checked_in_at) VALUES
  ('c0000000-0000-0000-0000-000000000141', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000045', 'c0000000-0000-0000-0000-000000000031', 'manual', 'a0000000-0000-0000-0000-000000000001', '2026-09-01 08:12:00+00'),
  ('c0000000-0000-0000-0000-000000000142', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000046', 'c0000000-0000-0000-0000-000000000031', 'qr',     NULL,                                   '2026-09-01 08:25:00+00'),
  ('c0000000-0000-0000-0000-000000000143', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000047', 'c0000000-0000-0000-0000-000000000031', 'qr',     NULL,                                   '2026-09-01 08:41:00+00'),
  ('c0000000-0000-0000-0000-000000000144', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000048', 'c0000000-0000-0000-0000-000000000032', 'manual', 'a0000000-0000-0000-0000-000000000001', '2026-09-01 10:02:00+00'),
  ('c0000000-0000-0000-0000-000000000145', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000032', 'qr',     NULL,                                   '2026-09-01 10:08:00+00'),
  ('c0000000-0000-0000-0000-000000000146', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000049', 'c0000000-0000-0000-0000-000000000033', 'qr',     NULL,                                   '2026-09-01 13:04:00+00')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Venue (008 + 018 positions). Location types: room/booth/table/stage/lab/desk.
-- Assignments: no two overlap on the same location (respects the exclusion
-- constraint from migrations 015/017).
-- ---------------------------------------------------------------------------
INSERT INTO venue_locations (id, event_id, name, location_type, capacity, description, position_x, position_y) VALUES
  ('c0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000000001', 'Main Hall',       'stage', 200, 'Primary stage, hacking floor, and demo seating.', 120, 80),
  ('c0000000-0000-0000-0000-000000000052', 'e0000000-0000-0000-0000-000000000001', 'Workshop Room A', 'room',  40,  'Breakout room for workshops and judged demo slots.', 420, 60),
  ('c0000000-0000-0000-0000-000000000053', 'e0000000-0000-0000-0000-000000000001', 'Booth Row A',     'booth', 30,  'Sponsor and project exhibition booths.',           700, 60),
  ('c0000000-0000-0000-0000-000000000054', 'e0000000-0000-0000-0000-000000000001', 'Team Table 1',    'table', 6,   'Demo-day table with power strip and signage.',     120, 300),
  ('c0000000-0000-0000-0000-000000000055', 'e0000000-0000-0000-0000-000000000001', 'Team Table 2',    'table', 6,   'Demo-day table with power strip and signage.',     420, 300),
  ('c0000000-0000-0000-0000-000000000056', 'e0000000-0000-0000-0000-000000000001', 'Electronics Lab 101', 'lab', 20, 'Soldering and test-equipment lab.',               700, 300)
ON CONFLICT (id) DO NOTHING;

-- venue_assignments are inserted AFTER project_submissions (FK dependency).

-- ---------------------------------------------------------------------------
-- Project submissions (009). One live ('submitted') submission per team —
-- satisfies migration 014's partial unique index. Weighted rule:
-- innovation 30% / technical 30% / presentation 20% / usefulness 20%.
--   CampusCart   : J1 90.90 | J2 88.80 -> AVG 89.85  (1st)
--   SafeSitter   : J1 83.40 | J2 81.00 -> AVG 82.20  (2nd)
--   QueueFree    : J1 70.90 | J2 69.00 -> AVG 69.95  (3rd)
-- ---------------------------------------------------------------------------
INSERT INTO project_submissions (id, event_id, team_id, title, description, repo_url, demo_url, status, submitted_at) VALUES
  ('c0000000-0000-0000-0000-000000000171', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', 'CampusCart',  'QR-based campus asset checkout system: students scan a QR code to borrow lab hardware, organizers see live availability, overdue alerts, and full audit history.', 'https://github.com/showcase-dev/campuscart',  'https://campuscart.showcase.dev', 'submitted', '2026-09-03 11:30:00+00'),
  ('c0000000-0000-0000-0000-000000000172', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000012', 'SafeSitter',  'IoT safety monitor: ESP32 sensor mesh watches lab benches for heat, gas, and motion anomalies and pushes real-time alerts to the organizer dashboard.',           'https://github.com/showcase-dev/safesitter',  'https://safesitter.showcase.dev', 'submitted', '2026-09-03 11:45:00+00'),
  ('c0000000-0000-0000-0000-000000000173', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000013', 'QueueFree',   'Virtual queue for campus services: join from your phone, get a live position and ETA, organizers manage counters and no-shows from a staff console.',              'https://github.com/showcase-dev/queuefree',   'https://queuefree.showcase.dev',  'submitted', '2026-09-03 12:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO judging_scores (id, project_submission_id, judge_user_id, score_total, score_innovation, score_technical, score_presentation, score_usefulness, feedback, submitted_at) VALUES
  ('c0000000-0000-0000-0000-000000000181', 'c0000000-0000-0000-0000-000000000171', 'c0000000-0000-0000-0000-000000000041', 90.90, 93, 90, 88, 92, 'Polished end-to-end flow; the checkout audit trail is a genuinely useful touch.', '2026-09-03 15:10:00+00'),
  ('c0000000-0000-0000-0000-000000000182', 'c0000000-0000-0000-0000-000000000171', 'c0000000-0000-0000-0000-000000000042', 88.80, 90, 86, 92, 88, 'Great UX and solid SQL constraint design; add offline mode for flaky venue WiFi.', '2026-09-03 15:25:00+00'),
  ('c0000000-0000-0000-0000-000000000183', 'c0000000-0000-0000-0000-000000000172', 'c0000000-0000-0000-0000-000000000041', 83.40, 82, 88, 78, 84, 'Impressive sensor fusion and alerting; the pitch could show more real incidents.', '2026-09-03 15:40:00+00'),
  ('c0000000-0000-0000-0000-000000000184', 'c0000000-0000-0000-0000-000000000172', 'c0000000-0000-0000-0000-000000000042', 81.00, 78, 84, 80, 82, 'Very robust engineering; calibration story needs work for real deployments.', '2026-09-03 15:55:00+00'),
  ('c0000000-0000-0000-0000-000000000185', 'c0000000-0000-0000-0000-000000000173', 'c0000000-0000-0000-0000-000000000041', 70.90, 71, 66, 76, 73, 'Useful concept, narrow scope; ETA accuracy was thin in the live demo.', '2026-09-03 16:10:00+00'),
  ('c0000000-0000-0000-0000-000000000186', 'c0000000-0000-0000-0000-000000000173', 'c0000000-0000-0000-0000-000000000042', 69.00, 69, 63, 72, 75, 'Nice no-show handling; would like to see multi-branch support.', '2026-09-03 16:25:00+00')
ON CONFLICT (project_submission_id, judge_user_id) DO NOTHING;

-- Second-judge scores for the pre-existing "Robot Arm" submissions from
-- seed.sql (random UUIDs, so reference by title; weighted 30/30/20/20):
--   Robot Arm v3: J1 78.00 + J2 79.60 -> AVG 78.80
--   Robot Arm v2: J1 75.00 + J2 72.00 -> AVG 73.50
INSERT INTO judging_scores (id, project_submission_id, judge_user_id, score_total, score_innovation, score_technical, score_presentation, score_usefulness, feedback, submitted_at)
SELECT 'c0000000-0000-0000-0000-000000000187', ps.id, 'c0000000-0000-0000-0000-000000000041', 79.60, 88, 80, 74, 72, 'Solid articulation and torque; gripper force feedback would push this higher.', '2026-09-03 16:40:00+00'
FROM project_submissions ps WHERE ps.event_id = 'e0000000-0000-0000-0000-000000000001' AND ps.title = 'Robot Arm v3'
ON CONFLICT (project_submission_id, judge_user_id) DO NOTHING;

INSERT INTO judging_scores (id, project_submission_id, judge_user_id, score_total, score_innovation, score_technical, score_presentation, score_usefulness, feedback, submitted_at)
SELECT 'c0000000-0000-0000-0000-000000000188', ps.id, 'c0000000-0000-0000-0000-000000000041', 72.00, 74, 66, 82, 68, 'Fast build, but repeatability suffered without encoders on the joints.', '2026-09-03 16:55:00+00'
FROM project_submissions ps WHERE ps.event_id = 'e0000000-0000-0000-0000-000000000001' AND ps.title = 'Robot Arm v2'
ON CONFLICT (project_submission_id, judge_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Venue assignments — AFTER project_submissions (FK dependency). No two
-- assignments overlap on the same location (respects 015/017 constraints).
-- ---------------------------------------------------------------------------
INSERT INTO venue_assignments (id, event_id, venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at, assigned_by, status) VALUES
  ('c0000000-0000-0000-0000-000000000161', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000054', 'team',    'c0000000-0000-0000-0000-000000000011', NULL,                                   '2026-09-03 10:00:00+00', '2026-09-03 11:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('c0000000-0000-0000-0000-000000000162', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000055', 'team',    'c0000000-0000-0000-0000-000000000012', NULL,                                   '2026-09-03 10:00:00+00', '2026-09-03 11:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('c0000000-0000-0000-0000-000000000163', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000054', 'team',    'c0000000-0000-0000-0000-000000000013', NULL,                                   '2026-09-03 11:15:00+00', '2026-09-03 12:15:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('c0000000-0000-0000-0000-000000000164', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000052', 'project', NULL,                                   'c0000000-0000-0000-0000-000000000171', '2026-09-03 13:00:00+00', '2026-09-03 14:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('c0000000-0000-0000-0000-000000000165', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000053', 'exhibit', 'c0000000-0000-0000-0000-000000000012', NULL,                                   '2026-09-02 09:00:00+00', '2026-09-02 17:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('c0000000-0000-0000-0000-000000000166', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000056', 'team',    'c0000000-0000-0000-0000-000000000013', NULL,                                   '2026-09-02 10:00:00+00', '2026-09-02 16:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Volunteers (010) — shifts + assignments (no overlapping shifts per volunteer)
-- ---------------------------------------------------------------------------
INSERT INTO volunteer_shifts (id, event_id, title, description, location, starts_at, ends_at, capacity, required_skills, status) VALUES
  ('c0000000-0000-0000-0000-000000000191', 'e0000000-0000-0000-0000-000000000001', 'Registration Desk Setup', 'Badge printing and swag distribution.',          'Main Hall',           '2026-09-01 07:00:00+00', '2026-09-01 10:00:00+00', 2, 'Communication',        'full'),
  ('c0000000-0000-0000-0000-000000000192', 'e0000000-0000-0000-0000-000000000001', 'Hardware Issue Desk',     'First-line troubleshooting for borrowed gear.',   'Electronics Lab 101', '2026-09-02 09:00:00+00', '2026-09-02 17:00:00+00', 1, 'Hardware diagnostics', 'full'),
  ('c0000000-0000-0000-0000-000000000193', 'e0000000-0000-0000-0000-000000000001', 'Demo-Day Ushering',       'Guide teams to tables and manage audience flow.', 'Main Hall',           '2026-09-03 09:00:00+00', '2026-09-03 14:00:00+00', 2, 'Crowd management',     'open')
ON CONFLICT (id) DO NOTHING;

INSERT INTO volunteer_assignments (id, volunteer_shift_id, user_id, status, assigned_by, checked_in_at, completed_at) VALUES
  ('c0000000-0000-0000-0000-000000000195', 'c0000000-0000-0000-0000-000000000191', 'c0000000-0000-0000-0000-000000000043', 'completed',  'a0000000-0000-0000-0000-000000000001', '2026-09-01 06:55:00+00', '2026-09-01 10:05:00+00'),
  ('c0000000-0000-0000-0000-000000000196', 'c0000000-0000-0000-0000-000000000191', 'c0000000-0000-0000-0000-000000000044', 'completed',  'a0000000-0000-0000-0000-000000000001', '2026-09-01 06:58:00+00', '2026-09-01 10:02:00+00'),
  ('c0000000-0000-0000-0000-000000000197', 'c0000000-0000-0000-0000-000000000192', 'c0000000-0000-0000-0000-000000000043', 'assigned',   'a0000000-0000-0000-0000-000000000001', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000198', 'c0000000-0000-0000-0000-000000000193', 'c0000000-0000-0000-0000-000000000044', 'checked_in', 'a0000000-0000-0000-0000-000000000001', '2026-09-03 09:02:00+00', NULL)
ON CONFLICT (volunteer_shift_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Incidents (011)
-- ---------------------------------------------------------------------------
INSERT INTO incidents (id, event_id, title, description, severity, status, location, reported_by, assigned_to, occurred_at, resolved_at) VALUES
  ('c0000000-0000-0000-0000-000000000201', 'e0000000-0000-0000-0000-000000000001', 'WiFi outage in Main Hall',           'Access point AP-3 stopped broadcasting; participants dropped offline for ~40 minutes.', 'high',   'resolved',      'Main Hall',       'c0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000001', '2026-09-02 14:10:00+00', '2026-09-02 15:05:00+00'),
  ('c0000000-0000-0000-0000-000000000202', 'e0000000-0000-0000-0000-000000000001', 'Projector flickering in Workshop A', 'Projector flickers during video playback; likely HDMI cable or lamp issue.',           'medium', 'investigating', 'Workshop Room A', 'c0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000001', '2026-09-03 09:40:00+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Certificates (011: UNIQUE(verification_code))
-- ---------------------------------------------------------------------------
INSERT INTO certificates (id, event_id, user_id, certificate_type, status, verification_code, issued_at, metadata) VALUES
  ('c0000000-0000-0000-0000-000000000211', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'attendance', 'issued', 'HACKATHON-2026-ATT-SARAH',   '2026-09-03 18:05:00+00', '{"sessions_attended": 2}'),
  ('c0000000-0000-0000-0000-000000000212', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000045', 'completion', 'issued', 'HACKATHON-2026-COMP-RAFI',   '2026-09-03 18:10:00+00', '{"team": "CodeForge", "placement": 1}'),
  ('c0000000-0000-0000-0000-000000000213', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000043', 'volunteer',  'issued', 'HACKATHON-2026-VOL-TANVIR',  '2026-09-03 18:12:00+00', '{"shifts_completed": 1}'),
  ('c0000000-0000-0000-0000-000000000214', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000041', 'judge',      'issued', 'HACKATHON-2026-JUDGE-NUSRAT','2026-09-03 18:15:00+00', '{"projects_scored": 3}')
ON CONFLICT (verification_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Budget & sponsorship (007)
-- ---------------------------------------------------------------------------
INSERT INTO sponsors (id, event_id, name, contact_name, contact_email, tier, notes) VALUES
  ('c0000000-0000-0000-0000-000000000221', 'e0000000-0000-0000-0000-000000000001', 'Robi Axiata Limited', 'Sabrina Haque', 'sponsors@robi.example.com',    'Gold',   'Title sponsor; keynote slot and booth at Booth Row A.'),
  ('c0000000-0000-0000-0000-000000000222', 'e0000000-0000-0000-0000-000000000001', 'Computer Source',     'Kamal Uddin',   'partners@csourse.example.com', 'Bronze', 'In-kind hardware sponsor; provided discount vouchers.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sponsor_contributions (id, sponsor_id, event_id, contribution_type, amount, description, received_at, recorded_by) VALUES
  ('c0000000-0000-0000-0000-000000000231', 'c0000000-0000-0000-0000-000000000221', 'e0000000-0000-0000-0000-000000000001', 'cash',    100000.00, 'Title sponsorship — cash prize pool.',    '2026-08-20 12:00:00+00', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000232', 'c0000000-0000-0000-0000-000000000222', 'e0000000-0000-0000-0000-000000000001', 'in_kind',  15000.00, 'T-shirts and swag for all participants.', '2026-08-25 12:00:00+00', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000233', 'c0000000-0000-0000-0000-000000000221', 'e0000000-0000-0000-0000-000000000001', 'cash',     25000.00, 'Venue and AV support top-up.',            '2026-08-28 12:00:00+00', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenditures (id, event_id, category, amount, vendor, description, spent_at, recorded_by, approved_by) VALUES
  ('c0000000-0000-0000-0000-000000000241', 'e0000000-0000-0000-0000-000000000001', 'Catering', 45000.00, 'Golden Plate Catering', 'Lunch, dinner, and coffee for all three days.', '2026-09-01 12:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000242', 'e0000000-0000-0000-0000-000000000001', 'Prizes',   60000.00, '—',                     'Champion, runner-up, and best-UI prize pool.',  '2026-09-03 17:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000243', 'e0000000-0000-0000-0000-000000000001', 'Printing',  8500.00, 'Poddar Printers',       'Banners, badges, signage, and judging sheets.', '2026-08-30 12:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
