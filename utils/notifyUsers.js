const { EmbedBuilder } = require('discord.js');
const Case = require('../models/Case');

module.exports = (_case, channels) => {
  const {
    processStep,
    approvalStatus,
  } = _case;

  if (processStep === 'Case Closed - Succeeded to Apologize') {
    // notify victim
    channels.forEach(((c) => {
      let notifyEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription(`This case has been successfully resolved! You may now close or leave this thread`);
      c.send({ embeds: [notifyEmbed] });
    }));
  } else if (processStep === 'Case Closed - Failed to Apologize') {
    if (approvalStatus === 'Victim Declined') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription(`This case was rejected by you.\nYou may now close or leave this thread`);
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription(`This case was rejected by the other user.\nYou may now close or leave this thread`);
      channels[0].send({ embeds: [victimEmbed] });
    };
  } else return;
}

