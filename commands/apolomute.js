const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('../utils/sendEmbedCaseAlert');
const sendApproveForm = require('../utils/sendApproveForm');

const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('apolomute')
          .setDescription("Mute with Apology option.")
          .addUserOption(option =>
            option
              .setName('offender')
              .setDescription('The user to mute with apology option.')
              .setRequired(true)
          )
          .addUserOption(option =>
            option
              .setName('victim')
              .setDescription('The user to receive the apology.')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('duration')
              .setDescription('Mute duration (30m, 1h, 1 day).')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for muting with apology option.')
              .setRequired(true)
          )
          .addAttachmentOption(option =>
            option
              .setName('proof')
              .setDescription('Proof (e.g image, screenshot) for the given case.')
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
          .setDMPermission(false),

  run: async ({ interaction }) => {
    // Get the user to ban
		const offender = interaction.options.getMember('offender');
		const victim = interaction.options.getMember('victim');
    const mod = interaction.member;

    const duration = interaction.options.getString('duration'); // 1d, 1 day, 1s 5s, 5m
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');

    await interaction.deferReply({ ephemeral: true });

    // TODO: Check conditions of user
    // 1. user (offender/victim) doesn't exist in server
    // 2. user is bot
    // 3. user's roles

    const msDuration = ms(duration);
    if (isNaN(msDuration)) {
      await interaction.editReply('Please provide a valid mute duration.');
      return;
    }

    if (msDuration < 5000 || msDuration > 2.419e9) {
      await interaction.editReply('Timeout duration cannot be less than 5 seconds or more than 28 days.');
      return;
    }

    if (!interaction.inGuild()) {
      interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
      return;

    };

    // Create a new case in the database
    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    let _case = new Case({
      guildId: interaction.guild.id,
      localCaseId: guild.totalCase + 1,
      modId: mod.id,
      duration: duration,
      reason: reason,
      proof: proof,
      createdOn: new Date(),
      offenderId: offender.id,
      victimId: victim.id,
      processStep: 'Waiting for Victim Request',
    });
    await _case.save();

    guild.totalCase += 1;
    await guild.save();


    // alert new case
    const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      .catch(console.error);

    sendEmbedCaseAlert(alertChannel, _case);

    // Mute the offender in all channels (assuming you have the necessary permissions)
    try {
      interaction.guild.channels.cache
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
            await channel.permissionOverwrites.create(offender.id, { SendMessages: false });
          }
        });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to mute offender', ephemeral: true });
    }

    // Create a private thread for the offender and the bot
    let offenderThread;
    try {
      offenderThread = await interaction.channel.threads.create({
        name: `case-offender-${offender.displayName}-${victim.displayName}`,
        type: ChannelType.PrivateThread,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for offender', ephemeral: true });
    }

    // Add the victim to the thread
    await offenderThread.members.add(offender);

    // Send a message to the offender in the private thread
    offenderThread.send(`You have been muted in all channels except this private thread.\nReason: ${reason}\nThis decision will be further reviewed by the moderation team and involving community member(s).`);
    _case.offenderThreadId = offenderThread.id;
    await _case.save();

    // TODO: add reason and other info here.
    interaction.editReply({ content: `${offender} has been muted from the server` });

    // Send a private thread to victim
    // Create a private thread
    let victimThread;
    try {
      victimThread = await interaction.channel.threads.create({
        name: `case-victim-${offender.displayName}-${victim.displayName}`,
        type: ChannelType.PrivateThread,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for victim' });
    }

    // Add the victim to the thread
    await victimThread.members.add(victim);

    _case.processStep = 'Waiting for Victim Request';
    _case.victimThreadId = victimThread.id;
    await _case.save();

    // Send form to victim
    sendApproveForm({
      type: 'yn',
      msg: `${victim}, our moderator ${mod.displayName} has observed inappropriate behavior from ${offender.displayName}, and took action by muting the user. Do you want to give them a second chance by requesting an apology?`,
      thread: victimThread,
      target: victim,
      _case: _case,
      customId: "apologyRequest",
      role: "victim",
    });

    // [testing] In the background, unmute the offender after the duration
    setTimeout(() => {
      try {
        interaction.guild.channels.cache
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
              await channel.permissionOverwrites.edit(offender.id, { SendMessages: true });
            }
          });
      } catch (error) {
        console.log(`Error: ${error}`);
        return interaction.reply({ content: 'An error occurred while trying to unmute offender', ephemeral: true });
      }
    }, msDuration);
  },

  devOnly: true,
};
