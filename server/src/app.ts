import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import eventsRoutes from "./modules/events/events.routes.js";
import hardwareRoutes from "./modules/hardware/hardware.routes.js";
import teamsRoutes from "./modules/teams/teams.routes.js";
import itineraryRoutes from "./modules/itinerary/itinerary.routes.js";
import checkinRoutes from "./modules/checkin/checkin.routes.js";
import certificatesRoutes from "./modules/certificates/certificates.routes.js";
import eventMembersRoutes from "./modules/event-members/event-members.routes.js";
import participantsRoutes from "./modules/participants/participants.routes.js";
import venueRoutes from "./modules/venue/venue.routes.js";
import projectsRoutes from "./modules/projects/projects.routes.js";
import judgingRoutes from "./modules/judging/judging.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { pool } from "./db/pool.js";

const app = express();

// Middleware
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/events/:eventId/hardware", hardwareRoutes);
app.use("/api/v1/events/:eventId/teams", teamsRoutes);
app.use("/api/v1/events/:eventId/itinerary", itineraryRoutes);
app.use("/api/v1/events/:eventId/checkin", checkinRoutes);
app.use("/api/v1/events/:eventId/certificates", certificatesRoutes);
app.use("/api/v1/events/:eventId/members", eventMembersRoutes);
app.use("/api/v1/events/:eventId/participants", participantsRoutes);
app.use("/api/v1/events/:eventId/venue", venueRoutes);
app.use("/api/v1/events/:eventId/projects", projectsRoutes);
app.use("/api/v1/events/:eventId/judging", judgingRoutes);
app.use("/api/v1/events/:eventId/notifications", notificationsRoutes);

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

// Detailed health check with database info (authenticated — exposes schema details)
app.get("/api/v1/health/detailed", authenticate, async (_req, res) => {
  try {
    const dbResult = await pool.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as postgres_version,
        now() as server_time,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections
    `);
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const migrationResult = await pool.query(`
      SELECT * FROM migrations ORDER BY id DESC LIMIT 5
    `).catch(() => ({ rows: [] }));
    
    res.json({ 
      success: true, 
      data: { 
        status: "ok",
        database: dbResult.rows[0],
        tables: tablesResult.rows.map(r => r.table_name),
        recent_migrations: migrationResult.rows,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      } 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: { 
        code: "DB_ERROR", 
        message: err instanceof Error ? err.message : "Database connection failed" 
      } 
    });
  }
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
