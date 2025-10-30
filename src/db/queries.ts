import type { Server, ServerConfig } from "../types/type";
import { db } from "../lib/db";
import { servers } from "./schema";

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
}
