const Apify = require('apify');
const { spawn } = require('child_process');
const fs = require('fs');
const tar = require('tar');
const tarfs = require('tar-fs');
const { execSync } = require('child_process');

Apify.getValue('INPUT').then((input) => {
  fs.writeFileSync('./actor/spiders/run.py', input.scrapyCode, (err) => {
    if (err) console.log(err);
    console.log('Successfully built scrapy spider.');
  });

  Apify.getValue('jobdir.tgz').then((stream) => {
    if (stream != null) {
      fs.writeFileSync('downloaded.tgz', stream);
      try {
        execSync('rm -r crawls/');
      } catch (err) {
        console.log(err);
      }
      fs.createReadStream('downloaded.tgz').pipe(tarfs.extract('./'));
    }

    let useProxy = false;
    let proxyAddress;
    if (!input.proxyConfig.useApifyProxy && input.proxyConfig.proxyUrls != null && input.proxyConfig.proxyUrls.length !== 0) {
      useProxy = true;
      const proxyUrl = input.proxyConfig.proxyUrls[0];
      proxyAddress = proxyUrl;
    } else if (input.proxyConfig.useApifyProxy && input.proxyConfig.apifyProxyGroups.length !== 0) {
      useProxy = true;
      const proxyGroups = input.proxyConfig.apifyProxyGroups.join('+');
      proxyAddress = `http://groups-${proxyGroups}:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
    } else if (input.proxyConfig.useApifyProxy) {
      useProxy = true;
      proxyAddress = `http://auto:${process.env.APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`;
    }

    const env = Object.create(process.env);
    if (useProxy) {
      env.http_proxy = proxyAddress;
    }

    const jobDir = 'persistentStorage';
    const scrapyList = spawn('scrapy', ['list']);
    const scrapyRun = spawn('xargs', ['-n', '1', 'scrapy', 'crawl', '-s', `JOBDIR=crawls/${jobDir}`], { env });

    scrapyList.stdout.on('data', (data) => {
      scrapyRun.stdin.write(data);
    });
    scrapyList.stderr.on('data', (data) => {
      console.log(`${data}`);
    });
    scrapyList.on('close', (code) => {
      if (code !== 0) {
        console.log(`scrapy list exited with code ${code}`);
      }
      scrapyRun.stdin.end();
    });
    scrapyRun.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    scrapyRun.stderr.on('data', (data) => {
      console.log(`${data}`);
    });
    scrapyRun.on('close', (code) => {
      if (code !== 0) {
        console.log(`scrapy crawl process exited with code ${code}`);
      }
    });

    setInterval(() => {
      tar.c({ gzip: false, file: 'jobdir.tgz' }, ['crawls/']).then(() => {
        Apify.setValue('jobdir.tgz', fs.readFileSync('jobdir.tgz'), { contentType: 'application/tar+gzip' });
      });
    }, 5000);
  });
});
