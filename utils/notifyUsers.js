const { EmbedBuilder } = require('discord.js');
const Case = require('../models/Case');

module.exports = (_case, channels) => {
  const {
    processStep,
    approvalStatus,
  } = _case;

  if (processStep === 'Case Closed - Succeeded to Apologize') {
    // victim
    let victimEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription("This case has been successfully resolved! You may now close or leave this thread.");
    channels[0].send({ embeds: [victimEmbed] });

    // offender
    let offenderEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription("This case has been successfully resolved! You are now unmuted and can access all channels.\nYou may now close or leave this thread.");
    channels[1].send({ embeds: [offenderEmbed] });
  } else if (processStep === 'Case Closed - Failed to Apologize') {
    if (approvalStatus === 'Victim Declined') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("This case was rejected by you.\nYou may now close or leave this thread.");
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("This case was rejected for review. You will remain muted for the determined duration.\nYou may now close or leave this thread.");
      channels[1].send({ embeds: [offenderEmbed] });

    } else if (approvalStatus === 'Offender Declined') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("The other user has refused to give an apology.\nYou may now close or leave this thread.");
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("This case was rejected by you. You will continue to be muted for the determined duration.\nYou may now close or leave this thread.");
      channels[1].send({ embeds: [offenderEmbed] });

    } else if (approvalStatus === 'Moderator Declined') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("The received apology was not approved by the moderator. The user will continue to be muted for the rest of the specified duration\nYou may now close or leave this thread.");
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("Your apology was not approved by the moderator. You will continue to be muted for the rest of the specified duration\nYou may now close or leave this thread.");
      channels[1].send({ embeds: [offenderEmbed] });

    } else if (approvalStatus === 'Final Declined') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("The received apology was not approved by you. The user will continue to be muted for the rest of the specified duration\nYou may now close or leave this thread.");
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("Your apology was not approved by the other user. You will continue to be muted for the rest of the specified duration\nYou may now close or leave this thread.");
      channels[1].send({ embeds: [offenderEmbed] });

    } else if (approvalStatus === 'Aborted') {
      // victim
      let victimEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("This case was aborted by the moderator.\nYou may now close or leave this thread.");
      channels[0].send({ embeds: [victimEmbed] });

      // offender
      let offenderEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription("This case was aborted by the moderator.\nYou may now close or leave this thread.");
      channels[1].send({ embeds: [offenderEmbed] });
    }
  } else if (processStep === 'Case Closed - Expired') {
    let victimEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription("This case has expired.\nYou may now close or leave this thread.");
    channels[0].send({ embeds: [victimEmbed] });

    // offender
    let offenderEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription("This case has expired.\nYou may now close or leave this thread.");
    channels[1].send({ embeds: [offenderEmbed] });
  } else return;
}

