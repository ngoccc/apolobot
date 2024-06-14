const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendRemarksForm = require('./sendRemarksForm');
const disableButton = require('../components/disableButton');

module.exports = async (victimThread, _case, msg) => {
  const approve = new ButtonBuilder()
                  .setCustomId(`victim-review-approve-${_case.id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success);
  const decline = new ButtonBuilder()
                  .setCustomId(`victim-review-decline-${_case.id}`)
                  .setLabel('Decline')
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(approve, decline);

  await victimThread.send({
    content: `${msg}`,
    components: [row],
  });
};
