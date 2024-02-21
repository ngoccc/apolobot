const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const Case = require('../models/Case');
const sendApproveForm = require('./sendApproveForm');

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

  // send response to victim
  const filter = (interaction) => interaction.user.id === _case.modId;
  const collector = channel.createMessageComponentCollector({ filter });

  collector.on('collect', async (interaction) => {
    const response = interaction.customId;
    if (response.includes('approve')) {
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Mod Approved';
      await _case.save();

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

      // Send form to victim
      sendApproveForm({
        type: 'ad',
        msg: `${victim}, we have received the response to your apology request from ${offender.displayName}:\n${offenderResponse}. Do you want to approve this apology?`,
        thread: victimThread,
        target: victim,
        _case: _case,
        customId: "apologyReview",
        role: "victim",
      });

      await interaction.reply('Apology response sent to victim!.', { ephemeral: true });
    } else if (response.includes('decline')) {
      // Send a thank you message
      // TODO: remarks?
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Case Closed - Failed to Apologize';
      _case.approvalStatus = 'Moderator Declined';
      await _case.save();

      await interaction.reply('Thank you for your response.', { ephemeral: true });
   }
  });
};
