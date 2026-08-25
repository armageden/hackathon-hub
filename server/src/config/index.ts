import dotenv from "dotenv";
dotenv.config();

// Fail fast rather than silently signing tokens with a repo-visible secret.
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/hackathon_hub",
  jwtSecret: process.env.JWT_SECRET || "hackathon-hub-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
} as const;
