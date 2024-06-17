const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const port = process.env.SERVER_PORT || process.env.PORT || 5050;        
const UUID = process.env.UUID || '77bbf836-1ab8-42e9-9fc9-3be8ad8134ce';
const NZ_SERVER = process.env.NZ_SERVER || '';     
const NZ_PORT = process.env.NZ_PORT || '443';
const NZ_KEY = process.env.NZ_KEY || '';
const AG_DOMAIN = process.env.AG_DOMAIN || '';
const AG_AUTH = process.env.AG_AUTH || '';
const CFIP = process.env.CFIP || 'na.ma';
const NAME = process.env.NAME || 'Choreo';

// root route
app.get("/", function(req, res) {
  res.send("Hello Choreo!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/sub2', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '443', id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: AG_DOMAIN, path: '/vmess?ed=2048', tls: 'tls', sni: AG_DOMAIN, alpn: '' };
  const vlessURL = `vless://${UUID}@${CFIP}:443?encryption=none&security=tls&sni=${AG_DOMAIN}&type=ws&host=${AG_DOMAIN}&path=%2Fvless?ed=2048#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const trojanURL = `trojan://${UUID}@${CFIP}:443?security=tls&sni=${AG_DOMAIN}&type=ws&host=${AG_DOMAIN}&path=%2Ftrojan?ed=2048#${NAME}-${ISP}`;
  
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n\n${trojanURL}`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// run-nezha
  let NZ_TLS = '';
  if (NZ_SERVER && NZ_PORT && NZ_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (tlsPorts.includes(NZ_PORT)) {
      NZ_TLS = '--tls';
    } else {
      NZ_TLS = '';
    }
  const command = `nohup ./swith -s ${NZ_SERVER}:${NZ_PORT} -p ${NZ_KEY} ${NZ_TLS} >/dev/null 2>&1 &`;
  try {
    exec(command);
    console.log('swith is running');

    setTimeout(() => {
      runWeb();
    }, 2000);
  } catch (error) {
    console.error(`swith running error: ${error}`);
  }
} else {
  console.log('NEZHA variable is empty, skip running');
  runWeb();
}

// run-xr-ay
function runWeb() {
  const command1 = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`web running error: ${error}`);
    } else {
      console.log('web is running');

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}

// run-server
function runServer() {
  let command2 = '';
  if (AG_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
    command2 = `nohup ./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${AG_AUTH} >/dev/null 2>&1 &`;
  } else {
    command2 = `nohup ./server tunnel --edge-ip-version auto --config tunnel.yml run >/dev/null 2>&1 &`;
  }

  exec(command2, (error) => {
    if (error) {
      console.error(`server running error: ${error}`);
    } else {
      console.log('server is running');
    }
  });
}

app.listen(port, () => console.log(`App is listening on port ${port}!`));
