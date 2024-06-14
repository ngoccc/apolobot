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

module.exports = (channel, _case) => {
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
    const modApprove = handleOffenderResponse(channel, _case, caseAlertEmbed); // This func returns 1 if offender response was mod-approved, otherwise 0
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

    channel.send({
      embeds: [caseAlertEmbed],
      components: [row],
    });

  } else {
    channel.send({ embeds: [caseAlertEmbed] });
  };
};
