import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Difficulty, Gamemode, ServerType } from "../types/type";

export const servers = sqliteTable("servers", {
	id: text("id").primaryKey().notNull(),
	name: text("name").unique().notNull(),
	ownerId: text("owner_id").notNull(),
	version: text("version").notNull(),
	maxPlayers: int("max_players").notNull(),
	difficulty: text("difficulty").$type<Difficulty>().notNull(),
	type: text("type").$type<ServerType>().notNull(),
	gamemode: text("gamemode").$type<Gamemode>().notNull(),
	description: text("description").notNull(),
	createdAt: text("created_at").notNull().default(sql`current_timestamp`),
	updatedAt: text("updated_at").notNull().default(sql`current_timestamp`),
});
