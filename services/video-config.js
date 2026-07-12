const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'videos.json');
let videoConfig = {};

function load() {
  try {
    videoConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).videos || {};
  } catch (e) {
    videoConfig = {};
  }
}

load();

try {
  fs.watch(CONFIG_PATH, () => {
    try {
      videoConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).videos || {};
    } catch (e) {}
  });
} catch (e) {}

function get() {
  return videoConfig;
}

function set(data) {
  videoConfig = data;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ videos: data }, null, 2));
  } catch (e) {
    console.error('Failed to write videos.json:', e.message);
  }
}

module.exports = { get, set };
