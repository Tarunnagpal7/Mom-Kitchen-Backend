const HyperTrack = require("hypertrack");

// Method 2: Initialize without object wrapper
const hypertrack = HyperTrack(
  process.env.HYPERTRACK_ACCOUNT_ID,
  process.env.HYPERTRACK_SECRET_KEY
);

module.exports = hypertrack;