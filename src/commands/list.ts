import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { queries as q } from "../db/queries";

export const list = {
  name: "list",
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists all Minecraft servers"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("⌛ Fetching server list...");

    try {
      const servers = await q.getAllServers();

      if (servers.length === 0) {
        await interaction.editReply("No servers found. Use `/create` to create your first server!");
        return;
      }

      const runningContainers = await docker.listContainers({ all: false });
      const runningNames = new Set(
        runningContainers
          .map(c => c.Names?.[0]?.replace(/^\//, ''))
          .filter((name): name is string => name !== undefined)
      )

      let message = `**Minecraft Servers (${servers.length}/${10}):**\n\n`;

      for (const server of servers) {
        const isRunning = runningNames.has(server.name);
        const statusEmoji = isRunning ? "🟢" : "⚪";
        const statusText = isRunning ? "Running" : "Stopped";

        message += `${statusEmoji} **${server.name}** - ${statusText}\n`;
        message += `   Version: ${server.version} | Gamemode: ${server.gamemode} | Difficulty: ${server.difficulty}\n`;
        if (server.description) {
          message += `   Description: ${server.description}\n`;
        }
        message += `   Owner: <@${server.ownerId}>\n\n`;
      }

      await interaction.editReply(message);

    } catch (error) {
      console.error("Error listing servers:", error);
      await interaction.editReply({ embeds: [createErrorEmbed("Failed to fetch server list. Please try again later.")] });
    }
  },
};
