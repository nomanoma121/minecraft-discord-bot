import { drizzle } from "drizzle-orm/bun-sqlite";

const dbFileName = process.env.DB_FILE_NAME || "database.db";
export const db = drizzle(dbFileName);
