const fs     = require('fs');
const zt   = require('zt-sdk-nodejs');

const UV_EOF = -4095;

const ztInit = async (ztFile) => {
  return new Promise((resolve, reject) => {
    var rc = zt.zt_init(ztFile, (init_rc) => {
        if (init_rc < 0) {
            return reject(`init_rc = ${init_rc}`);
        }
        return resolve();
    });

    if (rc < 0) {
        return reject(`rc = ${rc}`);
    }
  });
};

const ztServiceAvailable = async (service) => {
  return new Promise((resolve, reject) => {
    zt.zt_service_available(service, (obj) => {
      if (obj.status != 0) {
        console.log(`service ${service} not available, status: ${status}`);
        return reject(status);
      } else {
        console.log(`service ${service} available`);
        return resolve();
      }
    });
  });
}

const ztHttpRequest = async (url, method, headers) => {
  return new Promise((resolve) => {
    zt.Ziti_http_request(
      url, 
      method,
      headers,
      (obj) => { // on_req callback
          console.log('on_req callback: req is: %o', obj.req);
          return resolve(obj.req);
      },        
      (obj) => { // on_resp callback
        console.log(`on_resp status: ${obj.code} ${obj.status}`);
        if (obj.code != 200) {
          core.setFailed(`on_resp failure: ${obj.status}`);
          process.exit(-1);
        }
        process.exit(0);
      },
      (obj) => { // on_resp_body callback
        // not expecting any body...
        if (obj.len === UV_EOF) {
          console.log('response complete')
          process.exit(0);
        } else if (obj.len < 0) {
          core.setFailed(`on_resp failure: ${obj.len}`);
          process.exit(-1);
        }

        if (obj.body) {
          let str = Buffer.from(obj.body).toString();
          console.log(`on_resp_body len: ${obj.len}, body: ${str}`);
        } else {
          console.log(`on_resp_body len: ${obj.len}`);
        }
      });
  });
};

const ztHttpRequestData = async (req, buf) => {
  zt.Ziti_http_request_data(
    req, 
    buf,
    (obj) => { // on_req_body callback
      if (obj.status < 0) {
          reject(obj.status);
      } else {
          resolve(obj);
      }
  });
};

console.log('Going async...');
(async function() {
  try {
    const zidFile        = './zid.json'
    const ztId         = process.env.ZITI_IDENTITY;
    const webhookUrl     = process.env.WEBHOOK_URL;
    const webhookPayload = process.env.WEBHOOK_PAYLOAD;

    if (ztId === '') {
      console.log(`ZITI_IDENTITY env var was not specified`);
      process.exit(-1);
    }
    if (webhookUrl === '') {
      console.log(`WEBHOOK_URL env var was not specified`);
      process.exit(-1);
    }
    if (webhookPayload === '') {
      console.log(`WEBHOOK_PAYLOAD env var was not specified`);
      process.exit(-1);
    }


    // Write ztId to file
    fs.writeFileSync(zidFile, ztId);

    // First make sure we can initialize Ziti
    await ztInit(zidFile).catch((err) => {
      console.log(`ztInit failed: ${err}`);
      process.exit(-1);
    });

    // Make sure we have zt service available
    // Note: zt-sdk-nodejs (currently) requires service name to match URL host
    // (TODO: write an issue to change this - no reason that should need to match, and can lead to errors)
    let url = new URL(webhookUrl);
    let serviceName = url.hostname;
    await ztServiceAvailable(serviceName).catch((err) => {
      console.log(`ztServiceAvailable failed: ${err}`);
      process.exit(-1);
    });

    // Get the JSON webhook payload for the event that triggered the workflow. We expect it to already be stringify'd.
    const payload = `${webhookPayload}`;
    var payloadBuf = Buffer.from(payload, 'utf8');

    // Send it over Ziti
    let headersArray = [
      'User-Agent: GitLab-Hookshot/zt-gitlab-webhook', 
      'Content-Type: application/json',
      `Content-Length: ${payloadBuf.length}`,
    ];
    let req = await ztHttpRequest(webhookUrl, 'POST', headersArray).catch((err) => {
      console.log(`ztHttpRequest failed: ${err}`);
      process.exit(-1);
    });

    // Send the payload
    results = await ztHttpRequestData(req, payloadBuf).catch((err) => {
      console.log(`ztHttpRequestData failed: ${err}`);
      process.exit(-1);
    });
    zt.Ziti_http_request_end(req);

  } catch (error) {
    console.log(error.message);
  }
}());
