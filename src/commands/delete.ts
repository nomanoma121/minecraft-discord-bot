import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { queries as q } from "../db/queries";

const deleteCommand = {
  name: "delete",
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Deletes a Minecraft server")
    .addStringOption((option) =>
      option
        .setName("server-name")
        .setDescription("Name of the server to delete")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const serverName = interaction.options.getString("server-name")!;

    await interaction.reply(`⌛ Checking server "${serverName}"...`);

    try {
      const server = await q.getServerByName(serverName);
      if (!server) {
        await interaction.editReply({ embeds: [createErrorEmbed(`No server found with the name "${serverName}".`)] });
        return;
      }

      if (server.ownerId !== interaction.user.id) {
        await interaction.editReply({ embeds: [createErrorEmbed(`You are not the owner of server "${serverName}". Only the owner can delete this server.`)] });
        return;
      }

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `⌛ Removing server...`
      );

      const container = docker.getContainer(serverName);

      try {
        const containerInfo = await container.inspect();

        if (containerInfo.State.Running) {
          await container.stop();
          console.log(`Stopped container "${serverName}" before deletion.`);
        }

        await container.remove();
        console.log(`Removed Docker container "${serverName}".`);
      } catch (error) {
        console.log(`Container "${serverName}" not found, continuing with database cleanup.`);
      }

      await q.deleteServer(serverName);
      console.log(`Deleted server "${serverName}" from database.`);

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `✅ Remove server\n\n`
      );

      const embed = new EmbedBuilder()
        .setTitle(`Minecraft Server "${serverName}" Deleted`)
        .setColor(0xFF0000)
        .setDescription(`The Minecraft server "${serverName}" has been deleted successfully.`)
        .addFields(
          { name: "Server Name", value: server.name, inline: true },
          { name: "Version", value: server.version, inline: true },
          { name: "Owner", value: `<@${server.ownerId}>`, inline: true },
        )
        .setFooter({ text: "All data for this server has been removed." });

      await interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error("Error deleting the Minecraft server:", error);
      await interaction.editReply({ embeds: [createErrorEmbed("An error occurred while deleting the Minecraft server. Please try again later.")] });
    }
  },
};

export { deleteCommand as delete };
