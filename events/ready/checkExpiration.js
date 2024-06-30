const { PermissionsBitField } = require('discord.js');
const ms = require('ms');
const Case = require('../../models/Case');
const Guild = require('../../models/Guild');
const sendEmbedCaseAlert = require('../../utils/sendEmbedCaseAlert');
const notifyUsers = require('../../utils/notifyUsers');

module.exports = async (client) => {
  const guilds = client.guilds.cache;

  for (const [guildId, guild] of guilds) {
      await checkAndUnmuteCases(guild);
  }

}

async function checkAndUnmuteCases(guild) {
  let cases = await Case.find({ guildId: guild.id });
  cases.forEach(async (_case) => {
      const {
        createdOn,
        duration,
        processStep,
        approvalStatus,
      } = _case;
      const currentTime = new Date();
      const expirationTime = new Date(createdOn.getTime() + ms(duration));

      if ((processStep !== "Case Closed - Succeeded to Apologize" && currentTime > expirationTime) && (processStep !== "Case Closed - Expired") && (approvalStatus !== "Aborted")) {
        // Unmute offender
        try {
          guild.channels.cache
            .filter(
              (channel) =>
                ![
                  'GUILD_DIRECTORY',
                  'GUILD_NEWS_THREAD',
                  'GUILD_PRIVATE_THREAD',
                  'GUILD_PUBLIC_THREAD',
                ].includes(channel.type),
            )
            .forEach(async (channel) => {
              if (channel.type === 0 || channel.type === 2) {
                // duration timed out:
                if (channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ViewChannel)) {
                  await channel.permissionOverwrites.edit(_case.offenderId,
                    { 'SendMessages': true,
                      'SendMessagesInThreads': true,
                      'SendVoiceMessages': true,
                    });
                }
              }
            });
          if (!processStep.includes('Case Closed')) {
            _case.processStep = "Case Closed - Expired";
            await _case.save();
            // notify users (victim, offender)
            const { victimThreadId,
                    offenderThreadId,
                  } = _case;
            const offenderThread = await guild.channels.fetch(offenderThreadId);
            const victimThread = await guild.channels.fetch(victimThreadId);
            notifyUsers(_case, [victimThread, offenderThread]);
            // notify mod
            let guildDb = await Guild.findOne({ guildId: guild.id });
            const alertChannel = await guild.channels.fetch(guildDb.alertChannelId)
              .catch(console.error);
            sendEmbedCaseAlert(alertChannel, _case);
          }
        } catch (error) {
          console.log(`Unmute Error: ${error}`);
        }
      }
  });
}

