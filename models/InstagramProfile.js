const mongoose = require("mongoose");

const InstagramProfileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
  },
  profilePicture: {
    type: String,
  },
  followersCount: {
    type: Number,
  },
  followingCount: {
    type: Number,
  },
  bio: {
    type: String,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("InstagramProfile", InstagramProfileSchema);
