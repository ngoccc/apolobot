const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('../utils/sendEmbedCaseAlert');
const sendRemarksForm = require('../utils/sendRemarksForm');

module.exports = (victimThread, _case, msg) => {
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

  victimThread.send({
    content: `${msg}`,
    components: [row],
  });

  // send response to victim
  const filter = (interaction) => interaction.user.id === _case.victimId;
  const collector = victimThread.createMessageComponentCollector({ filter });

  collector.on('collect', async (interaction) => {
    const response = interaction.customId;
    if (response.includes('approve')) {
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Final Approved';
      _case.approvalStatus = 'All Approved';
      await _case.save();

      sendRemarksForm(interaction, extractedId);

    } else if (response.includes('decline')) {
      // Send a thank you message
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Case Closed - Failed to Apologize';
      _case.approvalStatus = 'Final Declined';
      await _case.save();

      sendRemarksForm(interaction, extractedId);
   }
  });
};
