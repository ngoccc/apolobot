const { Schema, model } = require('mongoose');

const caseSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  localCaseId: {
    type: Number,
    required: true,
  },
  modId: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  proof: {
    type: String,
  },
  createdOn: {
    type: Date,
    required: true,
  },
  offenderId: {
    type: String,
    required: true,
  },
  victimId: {
    type: String,
    required: true,
  },
  processStep: {
    type: String,
    required: true,
  },
  approvalStatus: {
    type: String,
  },
  victimThread: {
    type: String,
  },
  offenderThread: {
    type: String,
  },
  victimRequest: {
    type: String,
  },
  offenderResponse: {
    type: String,
  },
  remarks: {
    type: String,
  },
});

module.exports = model('Case', caseSchema);
