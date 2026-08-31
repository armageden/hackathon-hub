-- Demo dataset for a second "Demo Hackathon" event (demo mode).
--
-- Conventions (mirrors seed.sql):
--   * Fixed UUIDs only; every demo row id starts with d0000000-0000-0000-0000-...
--     (numbered blocks per table: teams 001x, members 002x, sessions 003x,
--     check-ins 004x, venues 005x/006x, hardware items 0001-0008, checkouts 007x,
--     damage reports 008x, projects 009x, scores 00ax, certificates 00bx).
--   * Every INSERT ends with ON CONFLICT ... DO NOTHING against the PK / unique
--     constraint declared in db/migrations, so this file is safe to re-run.
--   * Only pre-existing users from seed.sql are referenced (never inserted):
--       a0000000-0000-0000-0000-000000000001 -> admin@hackathon.com (admin)
--       a0000000-0000-0000-0000-000000000002 -> user@hackathon.com  (user)

-- ---------------------------------------------------------------------------
-- Event (002_create_events.sql: UNIQUE(slug))
-- ---------------------------------------------------------------------------
INSERT INTO events (id, name, slug, description, starts_at, ends_at, status, created_by)
VALUES (
  'e0000000-0000-0000-0000-000000000002',
  'Demo Hackathon',
  'demo-hackathon',
  'Demo-mode hackathon with rich fake data across every module.',
  '2026-09-10 08:00:00+00',
  '2026-09-12 18:00:00+00',
  'active',
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Event members (003: UNIQUE(event_id, user_id))
-- ---------------------------------------------------------------------------
INSERT INTO event_members (event_id, user_id, role, status)
VALUES
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'organizer', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'participant', 'active')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Extra demo participants (users table: UNIQUE(email))
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, full_name, password_hash, global_role)
VALUES
  ('d0000000-0000-0000-0000-000000000041', 'alice@demo.com', 'Alice Chen', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000042', 'bob@demo.com', 'Bob Kumar', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000043', 'carol@demo.com', 'Carol Reyes', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000044', 'dave@demo.com', 'Dave Okafor', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000045', 'eve@demo.com', 'Eve Santos', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000046', 'frank@demo.com', 'Frank Liu', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000047', 'grace@demo.com', 'Grace Kim', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000048', 'henry@demo.com', 'Henry Patel', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-000000000049', 'iris@demo.com', 'Iris Nakamura', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user'),
  ('d0000000-0000-0000-0000-00000000004a', 'jack@demo.com', 'Jack Wilson', '$2a$12$nWXtY4xYzMieXyhRHzyLz.X6M8wFktL.zSoVlXlUNtI515hP.E9i6', 'user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO event_members (event_id, user_id, role, status)
VALUES
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000041', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000042', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000043', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000044', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000045', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000046', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000047', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000048', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000049', 'participant', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-00000000004a', 'participant', 'active')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Participant profiles (participant_profiles: UNIQUE(event_id, user_id))
-- ---------------------------------------------------------------------------
INSERT INTO participant_profiles (event_id, user_id, bio, experience_level, preferred_role, looking_for_team, tech_stack_summary)
VALUES
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Full-stack dev who loves hackathons.', 'intermediate', 'Backend Developer', false, 'Node.js, PostgreSQL, React'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000041', 'CS student passionate about AI/ML.', 'beginner', 'ML Engineer', false, 'Python, TensorFlow, PyTorch'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000042', 'Hardware hacker and IoT enthusiast.', 'advanced', 'Embedded Systems', false, 'C++, Arduino, Raspberry Pi'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000043', 'UX designer who can also code.', 'intermediate', 'Frontend Developer', false, 'Figma, React, Tailwind CSS'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000044', 'DevOps engineer looking for a team.', 'expert', 'Cloud Architect', true, 'AWS, Docker, Kubernetes, Terraform'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000045', 'Mobile developer with a love for clean UIs.', 'advanced', 'Frontend Developer', false, 'React Native, Flutter, Swift'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000046', 'Data scientist who enjoys ML challenges.', 'intermediate', 'Data Scientist', true, 'Python, TensorFlow, Pandas'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000047', 'DevOps engineer and cloud enthusiast.', 'expert', 'DevOps Engineer', true, 'AWS, Docker, Kubernetes'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000048', 'Backend developer, APIs are my thing.', 'intermediate', 'Backend Developer', false, 'Node.js, PostgreSQL, Express'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000049', 'First hackathon, excited to learn!', 'beginner', 'Full Stack Developer', true, 'HTML, CSS, JavaScript'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-00000000004a', 'Security researcher and CTF player.', 'advanced', 'Security Engineer', false, 'Kali Linux, Wireshark, Burp Suite')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teams + members (004: teams PK(id); UNIQUE(team_id, user_id))
-- Admin NEVER joins teams - only participants do.
-- ---------------------------------------------------------------------------
INSERT INTO teams (id, event_id, name, description, max_size, status, created_by)
VALUES
  ('d0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000002', 'Neural Ninjas', 'Computer-vision murals and generative art.', 4, 'full', 'd0000000-0000-0000-0000-000000000041'),
  ('d0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000002', 'Byte Bandits', 'Hardware hacks and sensor networks.', 4, 'full', 'd0000000-0000-0000-0000-000000000042'),
  ('d0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000002', 'Quantum Quokkas', 'Quantum computing demos for curious humans.', 5, 'forming', 'd0000000-0000-0000-0000-000000000043'),
  ('d0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000002', 'Prompt Pirates', 'LLM tooling and prompt engineering shenanigans.', 4, 'forming', 'd0000000-0000-0000-0000-000000000048')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (id, team_id, user_id, role, assigned_by)
VALUES
  -- Neural Ninjas: Alice (owner), Bob, Eve
  ('d0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000041', 'owner', NULL),
  ('d0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000042', 'member', 'd0000000-0000-0000-0000-000000000041'),
  ('d0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000045', 'member', 'd0000000-0000-0000-0000-000000000041'),
  -- Byte Bandits: Bob (owner), Carol, Dave, Frank
  ('d0000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000042', 'owner', NULL),
  ('d0000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000043', 'member', 'd0000000-0000-0000-0000-000000000042'),
  ('d0000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000044', 'member', 'd0000000-0000-0000-0000-000000000042'),
  ('d0000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000046', 'member', 'd0000000-0000-0000-0000-000000000042'),
  -- Quantum Quokkas: Carol (owner), Henry
  ('d0000000-0000-0000-0000-000000000028', 'd0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000043', 'owner', NULL),
  ('d0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000048', 'member', 'd0000000-0000-0000-0000-000000000043'),
  -- Prompt Pirates: Henry (owner), Jack
  ('d0000000-0000-0000-0000-00000000002a', 'd0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000048', 'owner', NULL),
  ('d0000000-0000-0000-0000-00000000002b', 'd0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-00000000004a', 'member', 'd0000000-0000-0000-0000-000000000048')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Itinerary sessions (006: PK(id)) — six slots across the three days
-- ---------------------------------------------------------------------------
INSERT INTO itinerary_items (id, event_id, title, description, location, starts_at, ends_at, session_type)
VALUES
  ('d0000000-0000-0000-0000-000000000031', 'e0000000-0000-0000-0000-000000000002', 'Check-in & Registration', 'Grab your badge, swag bag, and team wristband.', 'Main Hall', '2026-09-10 08:00:00+00', '2026-09-10 09:30:00+00', 'general'),
  ('d0000000-0000-0000-0000-000000000032', 'e0000000-0000-0000-0000-000000000002', 'Opening Ceremony & Keynote', 'Welcome talk, rules walkthrough, and sponsor keynote.', 'Main Hall', '2026-09-10 10:00:00+00', '2026-09-10 11:30:00+00', 'ceremony'),
  ('d0000000-0000-0000-0000-000000000033', 'e0000000-0000-0000-0000-000000000002', 'Workshop: Rapid Prototyping with AI APIs', 'Hands-on session covering embeddings, vision APIs, and edge deployment.', 'Workshop Room A', '2026-09-10 13:00:00+00', '2026-09-10 15:00:00+00', 'workshop'),
  ('d0000000-0000-0000-0000-000000000034', 'e0000000-0000-0000-0000-000000000002', 'Lunch Break', 'Pizza, salad, and caffeine refills.', 'Lounge', '2026-09-11 12:00:00+00', '2026-09-11 13:30:00+00', 'general'),
  ('d0000000-0000-0000-0000-000000000035', 'e0000000-0000-0000-0000-000000000002', 'Overnight Hacking Block', 'Quiet-hours build sprint; mentors on call all night.', 'Main Hall', '2026-09-11 14:00:00+00', '2026-09-12 08:00:00+00', 'general'),
  ('d0000000-0000-0000-0000-000000000036', 'e0000000-0000-0000-0000-000000000002', 'Project Demos & Awards Ceremony', 'Three-minute demos per team followed by judging deliberation and prizes.', 'Main Hall', '2026-09-12 15:00:00+00', '2026-09-12 18:00:00+00', 'presentation')
ON CONFLICT (id) DO NOTHING;

-- Check-ins (006: PK(id) only — no UNIQUE(user_id, session) constraint exists,
-- the repository relies on a bare ON CONFLICT DO NOTHING).
INSERT INTO check_ins (id, event_id, user_id, itinerary_item_id, method, checked_in_by, checked_in_at)
VALUES
  ('d0000000-0000-0000-0000-000000000041', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000041', 'd0000000-0000-0000-0000-000000000031', 'manual', 'a0000000-0000-0000-0000-000000000001', '2026-09-10 08:12:00+00'),
  ('d0000000-0000-0000-0000-000000000042', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000042', 'd0000000-0000-0000-0000-000000000032', 'qr', NULL, '2026-09-10 09:55:00+00'),
  ('d0000000-0000-0000-0000-000000000043', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000043', 'd0000000-0000-0000-0000-000000000032', 'manual', 'a0000000-0000-0000-0000-000000000001', '2026-09-10 10:02:00+00'),
  ('d0000000-0000-0000-0000-000000000044', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000044', 'd0000000-0000-0000-0000-000000000031', 'qr', NULL, '2026-09-10 08:20:00+00'),
  ('d0000000-0000-0000-0000-000000000045', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000045', 'd0000000-0000-0000-0000-000000000033', 'manual', 'a0000000-0000-0000-0000-000000000001', '2026-09-10 13:05:00+00')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Venue (008_create_venue.sql uses venue_locations / venue_assignments;
-- assignments carry starts_at/ends_at and act as the bookings)
-- ---------------------------------------------------------------------------
INSERT INTO venue_locations (id, event_id, name, location_type, capacity, description)
VALUES
  ('d0000000-0000-0000-0000-000000000051', 'e0000000-0000-0000-0000-000000000002', 'Main Hall', 'stage', 200, 'Primary stage, hacking floor, and demo seating.'),
  ('d0000000-0000-0000-0000-000000000052', 'e0000000-0000-0000-0000-000000000002', 'Workshop Room A', 'room', 40, 'Breakout room for workshops and judged demo slots.'),
  ('d0000000-0000-0000-0000-000000000053', 'e0000000-0000-0000-0000-000000000002', 'Lounge', 'room', 25, 'Quiet rest area with snacks and board games.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Project submissions (009: PK(id)) + migration 014's partial unique index
-- uq_project_submissions_live_per_team ON (event_id, team_id)
-- WHERE status IN ('draft','submitted') — exactly one live submission per team.
-- All three are 'submitted' so the leaderboard covers every team.
-- ---------------------------------------------------------------------------
INSERT INTO project_submissions (id, event_id, team_id, title, description, repo_url, demo_url, status, submitted_at)
VALUES
  ('d0000000-0000-0000-0000-000000000091', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000011', 'DreamCanvas — AI Mural Generator', 'Turns sketches into large-format generative murals projected onto venue walls.', 'https://github.com/demo-hackathon/dreamcanvas', 'https://dreamcanvas.demo.dev', 'submitted', '2026-09-12 12:05:00+00'),
  ('d0000000-0000-0000-0000-000000000092', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000012', 'QueueSense — Smart Queue Analytics', 'LiDAR + camera fusion that predicts food-truck and helpdesk queue wait times.', 'https://github.com/demo-hackathon/queuesense', 'https://queuesense.demo.dev', 'submitted', '2026-09-12 12:15:00+00'),
  ('d0000000-0000-0000-0000-000000000093', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000014', 'PromptPirate — Browser LLM Playground', 'Side-by-side prompt diffing and cost tracking for local and hosted models.', 'https://github.com/demo-hackathon/promptpirate', 'https://promptpirate.demo.dev', 'submitted', '2026-09-12 12:25:00+00')
ON CONFLICT (id) DO NOTHING;

-- Bookings never overlap within the same location (the app enforces this via
-- findConflictingAssignment before insert). Placed after project_submissions
-- because assignments may point at a submission.
INSERT INTO venue_assignments (id, event_id, venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at, assigned_by, status)
VALUES
  ('d0000000-0000-0000-0000-000000000061', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000053', 'team', 'd0000000-0000-0000-0000-000000000012', NULL, '2026-09-11 09:00:00+00', '2026-09-11 18:00:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('d0000000-0000-0000-0000-000000000062', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000052', 'team', 'd0000000-0000-0000-0000-000000000013', NULL, '2026-09-12 10:00:00+00', '2026-09-12 11:30:00+00', 'a0000000-0000-0000-0000-000000000001', 'active'),
  ('d0000000-0000-0000-0000-000000000063', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000052', 'project', NULL, 'd0000000-0000-0000-0000-000000000091', '2026-09-12 13:00:00+00', '2026-09-12 14:30:00+00', 'a0000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Hardware inventory (005: PK(id)). Status mix so dashboards show variety:
-- six available, one checked_out, one damaged.
-- ---------------------------------------------------------------------------
INSERT INTO hardware_items (id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Jetson Orin Nano Developer Kit', 'AI Accelerators', '945-13766-0005', 'DEMO-JETSON-01', 3, 'new', 'available', 'Shelf A-1', 'Edge-AI dev kit for computer-vision projects.'),
  ('d0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Meta Quest 3 VR Headset', 'Peripherals', 'MQ3-128', 'DEMO-VR-01', 0, 'good', 'checked_out', 'Cabinet B-2', 'Standalone VR headset, charger included.'),
  ('d0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'DSLogic Logic Analyzer', 'Test Equipment', 'DSLogic Plus', 'DEMO-LA-01', 4, 'good', 'available', 'Shelf C-1', '16-channel USB logic analyzer with probes.'),
  ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'Weller Soldering Station', 'Tools', 'WE1010', 'DEMO-SOLD-01', 6, 'fair', 'available', 'Bench D-1', '70W station; tips in drawer underneath.'),
  ('d0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 'TF-Luna LiDAR Module', 'Sensors', 'TF-Luna', 'DEMO-LIDAR-01', 8, 'new', 'available', 'Shelf B-1', '8m ranging LiDAR, UART/I2C.'),
  ('d0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 'MG996R Metal Gear Servo (4-pack)', 'Actuators', 'MG996R', 'DEMO-SERVO-01', 10, 'good', 'available', 'Shelf E-2', 'High-torque servos for robotics builds.'),
  ('d0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 'Creality Ender 3 V2 3D Printer', 'Fabrication', 'Ender-3 V2', 'DEMO-3DP-01', 0, 'damaged', 'damaged', 'Maker Corner', 'Out of service pending repair (see damage report).'),
  ('d0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 'USB-C PD GaN Charger 65W', 'Power', 'AN-65W', 'DEMO-PD-01', 5, 'new', 'available', 'Shelf F-3', 'Fast chargers for laptops and dev boards.')
ON CONFLICT (id) DO NOTHING;

-- Checkouts: one genuinely overdue (dates relative to NOW() so analytics'
-- "due_at < NOW()" overdue count flags it whenever the seed runs), plus one
-- active checkout inside the event window.
INSERT INTO hardware_checkouts (id, event_id, hardware_item_id, borrower_user_id, checked_out_by, checked_out_at, due_at, status, notes)
VALUES
  (
    'd0000000-0000-0000-0000-000000000071',
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000041',
    'a0000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '2 days',
    'overdue',
    'Borrowed during demo-event setup prep; reminder sent, still not returned.'
  ),
  (
    'd0000000-0000-0000-0000-000000000072',
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000042',
    'a0000000-0000-0000-0000-000000000001',
    '2026-09-10 10:30:00+00',
    '2026-09-11 18:00:00+00',
    'active',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Damage report (012 added created_at with DEFAULT NOW(), so it is omitted here)
INSERT INTO hardware_damage_reports (id, event_id, hardware_item_id, checkout_id, reported_by, description, severity, status)
VALUES (
  'd0000000-0000-0000-0000-000000000081',
  'e0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000007',
  NULL,
  'a0000000-0000-0000-0000-000000000001',
  'Extruder drive gear stripped and bed thermistor reads intermittently after the Demo Day print marathon.',
  'major',
  'open'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Judging scores (009: score_* NUMERIC(5,2) CHECK 0..100,
-- UNIQUE(project_submission_id, judge_user_id)).
--
-- Weighted rule (judging.service.ts): innovation 30%, technical 30%,
-- presentation 20%, usefulness(impact) 20%. Expected totals:
--   DreamCanvas : J1 92*.30+88*.30+85*.20+90*.20 = 89.00 | J2 88*.30+82*.30+90*.20+86*.20 = 86.20 | AVG 87.60
--   QueueSense  : J1 78*.30+84*.30+80*.20+82*.20 = 81.00 | J2 74*.30+88*.30+76*.20+80*.20 = 79.80 | AVG 80.40
--   PromptPirate: J1 70*.30+65*.30+75*.20+72*.20 = 69.90 | J2 68*.30+62*.30+70*.20+74*.20 = 67.80 | AVG 68.85
-- Leaderboard ranks AVG(score_total) DESC -> 87.60, 80.40, 68.85 (distinct).
-- ---------------------------------------------------------------------------
INSERT INTO judging_scores (id, project_submission_id, judge_user_id, score_total, score_innovation, score_technical, score_presentation, score_usefulness, feedback, submitted_at)
VALUES
  ('d0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-000000000091', 'a0000000-0000-0000-0000-000000000001', 89.00, 92, 88, 85, 90, 'Gorgeous output quality; model latency work was impressive.', '2026-09-12 16:40:00+00'),
  ('d0000000-0000-0000-0000-0000000000a2', 'd0000000-0000-0000-0000-000000000091', 'a0000000-0000-0000-0000-000000000002', 86.20, 88, 82, 90, 86, 'Demo was polished; would love an offline mode.', '2026-09-12 16:52:00+00'),
  ('d0000000-0000-0000-0000-0000000000a3', 'd0000000-0000-0000-0000-000000000092', 'a0000000-0000-0000-0000-000000000001', 81.00, 78, 84, 80, 82, 'Solid sensor fusion pipeline; calibration story needs work.', '2026-09-12 17:05:00+00'),
  ('d0000000-0000-0000-0000-0000000000a4', 'd0000000-0000-0000-0000-000000000092', 'a0000000-0000-0000-0000-000000000002', 79.80, 74, 88, 76, 80, 'Very robust engineering, pitch felt rushed.', '2026-09-12 17:18:00+00'),
  ('d0000000-0000-0000-0000-0000000000a5', 'd0000000-0000-0000-0000-000000000093', 'a0000000-0000-0000-0000-000000000001', 69.90, 70, 65, 75, 72, 'Useful tool but scope was narrow.', '2026-09-12 17:30:00+00'),
  ('d0000000-0000-0000-0000-0000000000a6', 'd0000000-0000-0000-0000-000000000093', 'a0000000-0000-0000-0000-000000000002', 67.80, 68, 62, 70, 74, 'Nice UX touches; accuracy metrics were thin.', '2026-09-12 17:42:00+00')
ON CONFLICT (project_submission_id, judge_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Certificates (011). Note: there is no certificate_rules table in the
-- migrations — only `certificates` (PK(id), UNIQUE(verification_code)), so the
-- rules concept is represented by two issued/eligible certificate records.
-- ---------------------------------------------------------------------------
INSERT INTO certificates (id, event_id, user_id, certificate_type, status, verification_code, issued_at, metadata)
VALUES
  ('d0000000-0000-0000-0000-0000000000b1', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000041', 'attendance', 'issued', 'DEMO-HACKATHON-ATTENDANCE-U1', '2026-09-12 18:05:00+00', '{"sessions_attended": 3}'),
  ('d0000000-0000-0000-0000-0000000000b2', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000042', 'completion', 'eligible', 'DEMO-HACKATHON-COMPLETION-U2', NULL, '{"team": "Neural Ninjas", "placement": 1}')
ON CONFLICT (verification_code) DO NOTHING;
