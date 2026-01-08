import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
  },
  clickTimestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  referrer: {
    type: String,
    default: '',
  },
  country: {
    type: String,
    default: 'Unknown',
  },
  deviceType: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Bot', 'Unknown'],
    default: 'Unknown',
  },
});

analyticsSchema.index({ urlId: 1 });
analyticsSchema.index({ clickTimestamp: -1 });
analyticsSchema.index({ shortCode: 1 });

export default mongoose.model('Analytics', analyticsSchema);