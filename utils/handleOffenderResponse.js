const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const handleVictimFinalReview = require('./handleVictimFinalReview');
const sendRemarksForm = require('./sendRemarksForm');
const disableButton = require('../components/disableButton');

module.exports = (channel, _case, caseAlertEmbed) => {
  const approve = new ButtonBuilder()
                  .setCustomId(`approve-${_case.id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success);
  const decline = new ButtonBuilder()
                  .setCustomId(`decline-${_case.id}`)
                  .setLabel('Decline')
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(approve, decline);

  channel.send({
    embeds: [caseAlertEmbed],
    components: [row],
  });

  // send response to mod
  const filter = (interaction) => interaction.user.id === _case.modId;
  const collector = channel.createMessageComponentCollector({ filter });

  collector.on('collect', async (interaction) => {
    const response = interaction.customId;
    if (response.includes('approve')) {
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Mod Approved';
      await _case.save();

      // Disable the buttons
      await interaction.message.edit({
        components: [disableButton("Approved")],
      });

      // Send apology to victim
      const {
        victimId,
        offenderId,
        victimThreadId,
        offenderResponse
      } = _case;
      const victim = await interaction.guild.members.fetch(victimId);
      const offender = await interaction.guild.members.fetch(offenderId);
      const victimThread = await interaction.client.channels.fetch(victimThreadId);

      handleVictimFinalReview(
        victimThread,
        _case,
        `${victim}, we have received the response to your apology request from ${offender.displayName}:\n${offenderResponse}.\nDo you want to approve this apology?`
      );

      await interaction.reply('Apology response sent to victim!.', { ephemeral: true });

      return 1;
    } else if (response.includes('decline')) {

      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      sendRemarksForm(interaction, extractedId);

      _case.processStep = 'Case Closed - Failed to Apologize';
      _case.approvalStatus = 'Moderator Declined';
      await _case.save();

      return 0;
   }
  });
};
