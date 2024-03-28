const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// Function to create a disabled button
module.exports = (content) => {
  const builder = new ButtonBuilder()
    .setCustomId('disable')
    .setLabel(`${content}`)
    .setDisabled(true)
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder()
    .addComponents(builder);

  return row;
}
