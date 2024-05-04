const {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('view')
          .setDescription("View a case status by id.")
          .addNumberOption(option =>
            option
              .setName('id')
              .setDescription('The id of the case.')
              .setRequired(true)
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
          .setDMPermission(false),

  run: async ({ interaction }) => {
    // retrieve the case with the given id
		const searchId = interaction.options.getNumber('id');
    const _case = await Case.findOne({ localCaseId: searchId });

    await interaction.deferReply({ ephemeral: true });

    if (_case) {
      const {
        duration,
        reason,
        proof,
        modId,
        victimId,
        offenderId,
        processStep,
        victimRequest,
        offenderResponse,
        approvalStatus,
        remarks,
      } = _case;

      let caseAlertEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`Case ${searchId}`)
        .addFields(
          { name: 'Duration', value: `${duration}` },
          { name: 'Reason', value: `${reason}` },
          { name: 'Victim', value: `<@${victimId}>`, inline: true },
          { name: 'Offender', value: `<@${offenderId}>`, inline: true },
          { name: 'Mod', value: `<@${modId}>`, inline: true },
          { name: 'Process', value: `${processStep}` })

      if (proof) {
        caseAlertEmbed.setImage(proof);
      }
      if (approvalStatus) {
        caseAlertEmbed.addFields({ name: 'Approval Status', value: `${approvalStatus}` });
      }
      if (victimRequest) {
        caseAlertEmbed.addFields({ name: 'Victim Request', value: `${victimRequest}` });
      }
      if (offenderResponse) {
        caseAlertEmbed.addFields({ name: 'Offender Response', value: `${offenderResponse}` });
      }
      if (remarks) {
        caseAlertEmbed.addFields({ name: 'Remarks', value: `${remarks}` });
      }
      return await interaction.channel.send({ embeds: [caseAlertEmbed] });

    } else {
			return interaction.editReply({ content: 'An error occurred while trying to mute offender', ephemeral: true });
    }
  },
};
