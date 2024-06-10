const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('../utils/sendEmbedCaseAlert');

const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('apolounmute')
          .setDescription("Abort Mute with Apology option.")
          .addNumberOption(option =>
            option
              .setName('case-id')
              .setDescription('The id number of the case to unmute.')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for unmuting.')
              .setRequired(true)
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
          .setDMPermission(false),

  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });;
    };

		const caseId = await interaction.options.getNumber('case-id');
		const reason = await interaction.options.getString('reason');

    let _case = await Case.findOne({ localCaseId: caseId });

    if (!_case) {
      return interaction.reply({ content: `Cannot find case with id ${caseId}`, ephemeral: true });
    }

    if (_case.processStep.includes('Case Closed')) {
      return interaction.reply({ content: `Case ${caseId} has already been resolved`, ephemeral: true });
    }

    try {
      interaction.guild.channels.cache
        .filter(
          (channel) =>
            ![
              'GUILD_DIRECTORY',
              'GUILD_NEWS_THREAD',
              'GUILD_PRIVATE_THREAD',
              'GUILD_PUBLIC_THREAD',
            ].includes(channel.type),
        )
        .forEach(async (channel) => {
          if (channel.type === 0 || channel.type === 2) {
            await channel.permissionOverwrites.edit(_case.offenderId, { SendMessages: true });
          }
        });
    } catch (error) {
      console.log(`Error: ${error}`);
      return interaction.reply({ content: 'An error occurred while trying to unmute offender', ephemeral: true });
    }

    _case.approvalStatus = 'Aborted';
    _case.processStep = 'Case Closed - Failed to Apologize';
    _case.remarks = reason;
    await _case.save();

    // Alert offender and victim that the case was aborted
    const { victimThreadId,
            offenderThreadId,
          } = _case;
    const offenderThread = await interaction.client.channels.fetch(offenderThreadId);
    const victimThread = await interaction.client.channels.fetch(victimThreadId);
    notifyUsers(_case, [victimThread, offenderThread]);

    // Alert mod
    const guild = await Guild.findOne({ guildId: interaction.guild.id });
    const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
    sendEmbedCaseAlert(alertChannel, _case);
    return interaction.reply({ content: `Successfully abort case ${caseId}!`, ephemeral: true });
  },
};
