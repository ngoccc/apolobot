const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = async (interaction, extractedId) => {
  const remarksModal = new ModalBuilder()
    .setCustomId(`remarks-${extractedId}`)
    .setTitle('Remarks');

  // Add components to modal
  // Create the text input components
  const input = new TextInputBuilder()
    .setCustomId('remarks')
      // The label is the prompt the user sees for this input
    .setLabel("Please provide any remark on your decision.")
    .setPlaceholder("Here you can express any thoughts regarding the given incident. Enter 0 if you don't want to leave any remark.")
      // Short means only a single line of text
    .setStyle(TextInputStyle.Paragraph)
  // .setMaxLength(1000)
  // .setMinLength(10) // TODO: specify these number

  // An action row only holds one text input,
  // so you need one action row per text input.
  const actionRow = new ActionRowBuilder().addComponents(input);

  // Add inputs to the modal
  remarksModal.addComponents(actionRow);

  // Show the modal to the user
  await interaction.showModal(remarksModal);
};
