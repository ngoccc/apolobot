const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
} = require('discord.js');
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
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  run: async ({ interaction }) => {
    // Check conditions
    if (!interaction.member.permissions.has('ADMINISTRATOR'))
      return interaction.reply({ content: 'You do not have the required permissions to use this command.', ephemeral: true });

    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
    };

    const targetChannel = interaction.options.getChannel('alert-channel');
    if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ViewChannel)) {
      return interaction.reply({
        content: 'ApoloBot does not have access to the channel. Try adding ApoloBot to the channel or grant it permission to view it first (Edit Channel > Permissions > Add members or roles).',
        ephemeral: true,
      });
    }

    try {
      const targetGuild = interaction.guild;

      // Save channel ID to database
      let guild = await Guild.findOne({ guildId: targetGuild.id });

      if (guild) {
        if (guild.alertChannelId === targetChannel.id) {
          return interaction.reply({ content: `Alert channel has already been set to ${targetChannel}.`});
        } else {
          guild.alertChannelId = targetChannel.id;
        }
      }
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
};
