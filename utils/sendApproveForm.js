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

// sendApproveForm('yn', "the mod team has...", victimThread, interaction, victim, _case, apologyResponse);
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
                  .setCustomId(`yes-${_case.id}`)
                  .setLabel(`${type === 'yn' ? 'Yes' : 'Approve'}`)
                  .setStyle(ButtonStyle.Success);
  const no = new ButtonBuilder()
                  .setCustomId(`no-${_case.id}`)
                  .setLabel(`${type === 'yn' ? 'No' : 'Decline'}`)
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(yes, no);

  const promptMessage = await thread.send({
    content: `${msg}`,
    components: [row],
  });

  const filter = (interaction) => interaction.user.id === target.id;
  const collector = thread.createMessageComponentCollector({ filter });

  collector.on('collect', async (interaction) => {
    const response = interaction.customId;

    if (response.includes('yes')) {
      // Create the modal
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      const modal = new ModalBuilder()
        .setCustomId(`${customId}-${extractedId}`)
        .setTitle(`${customId.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`);

      // Add components to modal
      // Create the text input components
      const input = new TextInputBuilder()
        .setCustomId(`${customId}`)
          // The label is the prompt the user sees for this input
        .setLabel("Enter your response here.")
          // Short means only a single line of text
        .setStyle(TextInputStyle.Paragraph)
      // .setMaxLength(1000)
      // .setMinLength(10) // TODO: specify these number
        .setRequired(true);

      // An action row only holds one text input,
      // so you need one action row per text input.
      const actionRow = new ActionRowBuilder().addComponents(input);

      // Add inputs to the modal
      modal.addComponents(actionRow);

      // Show the modal to the user
      await interaction.showModal(modal);

    } else if (response.includes('no')) {
      // Send a thank you message
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Case Closed - Failed to Apologize';
      _case.approvalStatus = `${role} Declined `;
      await _case.save();

      sendRemarksForm(interaction, extractedId);
      // notify victim and offender
      const victimThread = await interaction.client.channels.fetch(_case.victimThreadId);
      const offenderThread = await interaction.client.channels.fetch(_case.offenderThreadId);
      notifyUsers(_case, [victimThread, offenderThread]);

      // Disable the buttons
      row.components[0].setDisabled(true);
      row.components[1].setDisabled(true);
      interaction.editReply({
        content: `${msg}`,
        components: [row],
      });
    }
  });
};
