const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrunio9ddf7 = onRequest({"region":"us-central1","maxInstances":10,"memory":"512MiB"}, (req, res) => server.then(it => it.handle(req, res)));
  