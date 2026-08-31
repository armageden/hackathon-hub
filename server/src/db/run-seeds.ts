import { pool } from "./pool.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeeds() {
  const seedFiles = ["seed.sql", "showcase-seed.sql"];

  for (const file of seedFiles) {
    const seedFile = path.join(__dirname, "seeds", file);
    const sql = fs.readFileSync(seedFile, "utf-8");

    console.log(`Running seed data (${file})...`);
    try {
      await pool.query(sql);
      console.log(`Seed data inserted successfully (${file})`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Seed failed (${file}):`, error.message);
      process.exit(1);
    }
  }

  await pool.end();
}

runSeeds().catch((err) => {
  console.error("Seed runner failed:", err);
  process.exit(1);
});
