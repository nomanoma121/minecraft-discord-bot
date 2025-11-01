import type { Server, ServerConfig } from "../types/type";
import { db } from "../lib/db";
import { servers } from "./schema";
import { count, eq } from "drizzle-orm";

export const queries = {
  createServer: async (ownerId: string, config: ServerConfig): Promise<Server> => {
    const [server] = await db
      .insert(servers)
      .values({
        name: config.name,
        ownerId: ownerId,
        version: config.version,
        maxPlayers: config.maxPlayers,
        difficulty: config.difficulty,
        type: config.type,
        gamemode: config.gamemode,
        description: config.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    if (!server) {
      throw new Error("Failed to create server");
    }
    return server;
  },
  getAllServers: async (): Promise<Server[]> => {
    return await db.select().from(servers);
  },
  isServerNameAvailable: async (name: string): Promise<boolean> => {
    const result = await db.select().from(servers).where(eq(servers.name, name)).limit(1);
    return result.length === 0;
  },
  getCurrentServerCount: async (): Promise<number> => {
    const result = await db.select({ count: count() }).from(servers);
    return result[0]?.count ?? 0;
  },
  getServerByName: async (name: string): Promise<Server | null> => {
    const [server] = await db.select().from(servers).where(eq(servers.name, name)).limit(1);
    return server || null;
  },
  deleteServer: async (name: string): Promise<void> => {
    await db.delete(servers).where(eq(servers.name, name));
  },
}
