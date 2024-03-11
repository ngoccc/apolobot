const { EmbedBuilder } = require('discord.js');
const Case = require('../models/Case');

module.exports = (_case, channels) => {
  const {
    processStep,
  } = _case;

  if (processStep === 'Case Closed - Succeeded to Apologize') {
    // notify victim
    channels.forEach(((c) => {
      let notifyEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription('This case is successfully resolved! You may now close this thread');
      c.send({ embeds: [notifyEmbed] });
    }));
  }
}
