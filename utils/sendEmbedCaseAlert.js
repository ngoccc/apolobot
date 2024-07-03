const {
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  BaseChannel,
} = require('discord.js');
const Case = require('../models/Case');
const handleOffenderResponse = require('./handleOffenderResponse');
const notifyUsers = require('./notifyUsers');
const disableButton = require('../components/disableButton');

module.exports = async (channel, _case) => {
  const {
    proof,
    duration,
    reason,
    localCaseId,
    modId,
    victimId,
    offenderId,
    processStep,
    victimRequest,
    offenderResponse,
    approvalStatus,
    remarks,
    initialMessageId,
    guildId,
  } = _case;

  let caseAlertEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`Case ${localCaseId}`)
    //.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
    .setDescription('A new update was received from the case!')
    .addFields(
      { name: 'Victim', value: `<@${victimId}>`, inline: true },
      { name: 'Offender', value: `<@${offenderId}>`, inline: true },
      { name: 'Mod', value: `<@${modId}>`, inline: true },
      { name: 'Process', value: `${processStep}` })


  if (processStep === 'Waiting for Victim Request') {
    if (proof) {
      caseAlertEmbed.setImage(proof);
    }
    caseAlertEmbed.addFields({ name: 'Duration', value: `${duration}` });
    caseAlertEmbed.addFields({ name: 'Reason', value: `${reason}` });
  }
  if (remarks) {
    caseAlertEmbed.addFields({ name: 'Remarks', value: `${remarks}` });
  }

  if (processStep === 'Victim Requested') {
    caseAlertEmbed.addFields({ name: 'Victim Request', value: `${victimRequest}` });
  }
  if (approvalStatus && processStep === 'Case Closed - Failed to Apologize') {
    caseAlertEmbed.addFields({ name: 'Approval Status', value: `${approvalStatus}` });
  }

  if (processStep === 'Offender Responded') {
    caseAlertEmbed.addFields({ name: 'Offender Response', value: `${offenderResponse}` });
    const initialMessage = await channel.messages.fetch(initialMessageId);
    const thread = initialMessage.hasThread ? initialMessage.thread : await initialMessage.startThread({ name: `update-case-${caseData.id}` });
    const modApprove = handleOffenderResponse(thread, _case, caseAlertEmbed); // This func returns 1 if offender response was mod-approved, otherwise 0
    if (modApprove) {
      // TODO: send embed saying that mod approve?
    } else {
      // decline = remarks = let the event handler do the rest?
    }
  } else if (processStep === 'Final Approved') {
    const unmute = new ButtonBuilder()
                    .setCustomId(`unmute-${_case.id}`)
                    .setLabel('Unmute Offender')
                    .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder()
                    .addComponents(unmute);

    if (!initialMessageId) {
      // create new message for thread
      const initialMessage = await channel.send({
        content: `<@${modId}>`,
        embeds: [caseAlertEmbed],
      });
      _case.initialMessageId = initialMessage.id;
      await _case.save();
    } else {
      const initialMessage = await channel.messages.fetch(initialMessageId);
      const thread = initialMessage.hasThread ? initialMessage.thread : await initialMessage.startThread({ name: `update-case-${caseData.id}` });
      await thread.send({
        content: `<@${modId}>`,
        embeds: [caseAlertEmbed],
        components: [row],
      });
    }

  } else {
    if (!initialMessageId) {
      // create new message for thread
      const initialMessage = await channel.send({
        content: `<@${modId}>`,
        embeds: [caseAlertEmbed],
      });
      _case.initialMessageId = initialMessage.id;
      await _case.save();
    } else {
      // send update in the thread
      const initialMessage = await channel.messages.fetch(initialMessageId);
      const thread = initialMessage.hasThread ? initialMessage.thread : await initialMessage.startThread({ name: `update-case-${localCaseId}` });
      await thread.send({
        content: `<@${modId}>`,
        embeds: [caseAlertEmbed],
      });
    }
  };
};
