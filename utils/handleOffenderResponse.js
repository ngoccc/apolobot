const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const disableButton = require('../components/disableButton');

module.exports = (thread, _case, caseAlertEmbed) => {
  const approve = new ButtonBuilder()
                  .setCustomId(`mod-review-approve-${_case.id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success);
  const decline = new ButtonBuilder()
                  .setCustomId(`mod-review-decline-${_case.id}`)
                  .setLabel('Decline')
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(approve, decline);

  thread.send({
    content: `<@${_case.modId}>`,
    embeds: [caseAlertEmbed],
    components: [row],
  });
};
