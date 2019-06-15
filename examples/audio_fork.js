const Srf = require('drachtio-srf');
const srf = new Srf();
const Mrf = require('drachtio-fsmrf');
const mrf = new Mrf(srf);
const argv = require('minimist')(process.argv.slice(2));
const wsUrl = argv._[0];
const config = require('config');
const text = 'Hi there.  Please go ahead and make a recording and then hangup';

if (!wsUrl) throw new Error('must specify ws server to connect to');
console.log(`We will be streaming audio to websocket server at ${wsUrl}`);

srf.connect(config.get('drachtio'))
  .on('connect', (err, hp) => console.log(`connected to sip on ${hp}`))
  .on('error', (err) => console.log(err, 'Error connecting'));

mrf.connect(config.get('freeswitch'))
  .then((ms) => run(ms));

function run(ms) {
  srf.invite((req, res) => {
    console.log('connecting call');
    ms.connectCaller(req, res)
      .then(({endpoint, dialog}) => {
        console.log('call connected');
        dialog.on('destroy', () => endpoint.destroy());
        doFork(req, dialog, endpoint);  
      })
      .catch((err) => {
        console.log(err, 'Error connecting call to freeswitch');
      });
  });
}

async function doFork(req, dlg, ep) {
  console.log('sending command to fork audio');
  const metadata = {
    callId: req.get('Call-Id'),
    to: req.getParsedHeader('To').uri,
    from: req.getParsedHeader('From').uri,
  }
  /*
  await ep.play('silence_stream://1000');
  await ep.speak({
    ttsEngine: 'google_tts',
    voice: 'en-GB-Wavenet-A',
    text
  });
  */
 const result = await ep.forkAudioStart({
    wsUrl,
    mixType: 'mono',
    sampling: 48000,
    metadata
  });
  console.log(`result from fork ${JSON.stringify(result)}`);
}
