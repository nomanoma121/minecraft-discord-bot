import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { docker } from "../lib/docker";
import { queries as q } from "../db/queries";

export const status = {
  name: "status",
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows the status of a Minecraft server")
    .addStringOption((option) =>
      option
        .setName("server-name")
        .setDescription("Name of the server to check")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const serverName = interaction.options.getString("server-name")!;

    await interaction.deferReply();

    try {
      const server = await q.getServerByName(serverName);
      if (!server) {
        await interaction.editReply(`❌ Server "${serverName}" not found.`);
        return;
      }

      const container = docker.getContainer(serverName);
      let containerInfo;

      try {
        containerInfo = await container.inspect();
      } catch (error) {
        await interaction.editReply(
          `**Server: ${server.name}**\n` +
          `Status: ⚪ Container Not Found\n\n` +
          `**Configuration:**\n` +
          `Version: ${server.version}\n` +
          `Gamemode: ${server.gamemode}\n` +
          `Difficulty: ${server.difficulty}\n` +
          `Type: ${server.type}\n` +
          `Max Players: ${server.maxPlayers}\n` +
          `Description: ${server.description || 'N/A'}\n` +
          `Owner: <@${server.ownerId}>`
        );
        return;
      }
      const isRunning = containerInfo.State.Running;
      const statusEmoji = isRunning ? "🟢" : "⚪";
      const statusText = isRunning ? "Running" : "Stopped";

      let message = `**Server: ${server.name}**\n`;
      message += `Status: ${statusEmoji} ${statusText}\n\n`;

      message += `**Configuration:**\n`;
      message += `Version: ${server.version}\n`;
      message += `Gamemode: ${server.gamemode}\n`;
      message += `Difficulty: ${server.difficulty}\n`;
      message += `Type: ${server.type}\n`;
      message += `Max Players: ${server.maxPlayers}\n`;
      message += `Description: ${server.description || 'N/A'}\n`;
      message += `Owner: <@${server.ownerId}>\n\n`;

      if (isRunning) {
        message += `**Runtime Info:**\n`;
        message += `Started: ${new Date(containerInfo.State.StartedAt).toLocaleString()}\n`;
        message += `Port: 25565\n`;
      }
      
      await interaction.editReply(message);

    } catch (error) {
      console.error("Error checking server status:", error);
      await interaction.editReply("❌ Failed to check server status.");
    }
  },
};
