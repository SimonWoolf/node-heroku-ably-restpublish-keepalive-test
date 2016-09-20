const express = require('express');
const app = express();
const Ably = require('ably');
const rollbar = require("rollbar");
process.env.ROLLBAR_TOKEN && rollbar.init(process.env.ROLLBAR_TOKEN);
process.env.ROLLBAR_TOKEN && rollbar.handleUncaughtExceptions(process.env.ROLLBAR_TOKEN);
const report = rollbar.reportMessage;

app.set('port', (process.env.PORT || 5000));

function logHandler(msg) {
  const time = new Date();
  // shouldn't happen, but just in case
  if(msg.includes("socket") || msg.includes("ECONN") || msg.includes("ETIMEDOUT")) {
    report(msg, 'error');
  }
  console.log(`${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}.${time.getMilliseconds()}`, msg);
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(arr.length * Math.random())];
}

function publish(channel) {
  channel.publish(null, null, (err) => {
    console.log("Publish callback, err = ", err);
    if(err) {
      report(`Publish error: ${JSON.stringify(err)}`, 'error');
    }
  });
}

function publishLotsSimultaneously(channel) {
  const numPublishes = randomInt(1, 50);
  console.log(`Publishing ${numPublishes} times`);
  for(let i=0; i<numPublishes; i++) {
    publish(channel);
  }
}

function publishLotsSimultaneouslyOccasionally(channel) {
  publishLotsSimultaneously(channel);
  const wait = randomChoice([10, 60, 5 * 60, 20 * 60]);
  console.log(`waiting ${wait} seconds`);
  setTimeout(() => publishLotsSimultaneouslyOccasionally(channel), wait * 1000);
}

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));

  const realtime = new Ably.Rest({
    key: process.env.ABLY_KEY,
    echoMessages: true,
    log: {level: 4, handler: logHandler},
    // specify hosts so that fallback functionality is disabled
    restHost: 'rest.ably.io',
  });

  const channel = realtime.channels.get('testChannel');
  publishLotsSimultaneouslyOccasionally(channel);
});


