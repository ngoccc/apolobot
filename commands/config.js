const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription("Config for Apolobot")
    .addChannelOption(option =>
      option
        .setName('alert-channel')
        .setDescription('The channel to receive Apolobot alerts.')
        .setRequired(true)
    ),
  run: async ({ interaction }) => {
    // Check conditions
    if (!interaction.member.permissions.has('ADMINISTRATOR'))
      return interaction.reply({ content: 'You do not have the required permissions to use this command.', ephemeral: true });

    if (!interaction.inGuild()) {
      interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
      return;
    };

    try {
      // Get the mentioned channel
      const targetChannel = interaction.options.getChannel('alert-channel');
      const targetGuild = interaction.guild;

      // [Testing] Log information
      console.log(`Alert channel set to: ${targetChannel.name}`);
      console.log(`Channel id: ${targetChannel.id}`)

      // Save channel ID to database
      let guild = await Guild.findOne({ guildId: targetGuild.id });

      if (guild) { guild.alertChannelId = targetChannel.id; }
      else {
        guild = new Guild({
          guildId: targetGuild.id,
          alertChannelId: targetChannel.id,
        });
      }

      await guild.save();

      return interaction.reply({ content: `Alert channel set to: ${targetChannel}.`});
    } catch (error) {
      console.log(`Error with /config: ${error}.`);
			return interaction.reply({ content: 'An error occurred while configuring the channel.', ephemeral: true });
    }
  },
  devOnly: true,
};
