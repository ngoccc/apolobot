const { EmbedBuilder, BaseChannel } = require('discord.js');
const Case = require('../models/Case');
const handleOffenderRequest = require('./handleOffenderRequest');

module.exports = (channel, _case) => {
  const {
    localCaseId,
    modId,
    victimId,
    offenderId,
    processStep,
    victimRequest,
    offenderResponse,
    approvalStatus,
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

  if (processStep === 'Victim Requested') {
    caseAlertEmbed.addFields({ name: 'Victim Request', value: `${victimRequest}` });
  }
  if (approvalStatus && approvalStatus === 'Case Closed - Failed to Apologize') {
    caseAlertEmbed.addFields({ name: 'Approval Status', value: `${approvalStatus}` });
  }

  if (processStep === 'Offender Responded') {
    caseAlertEmbed.addFields({ name: 'Offender Response', value: `${offenderResponse}` });
    handleOffenderRequest(channel, _case, caseAlertEmbed);
  // } else if (processStep === 'Final Approved') {
  //   // handleFinalApprove(channel, _case, caseAlertEmbed);
  //   console.log('test-final step!');
  } else {
    channel.send({ embeds: [caseAlertEmbed] });
  };
};
