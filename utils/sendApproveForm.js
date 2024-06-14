const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const sendRemarksForm = require('./sendRemarksForm');
const notifyUsers = require('./notifyUsers');
const Case = require('../models/Case');
const disableButton = require('../components/disableButton');

module.exports = async (args) => {
  const {
    type,
    msg,
    thread,
    target,
    _case,
    customId,
    role,
  } = args;
  // Send initial prompt
  const yes = new ButtonBuilder()
                  .setCustomId(`${customId}-yes-${_case.id}`)
                  .setLabel(`${type === 'yn' ? 'Yes' : 'Approve'}`)
                  .setStyle(ButtonStyle.Success);
  const no = new ButtonBuilder()
                  .setCustomId(`${customId}-no-${_case.id}`)
                  .setLabel(`${type === 'yn' ? 'No' : 'Decline'}`)
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(yes, no);

  const promptMessage = await thread.send({
    content: `${msg}`,
    components: [row],
  });
};
