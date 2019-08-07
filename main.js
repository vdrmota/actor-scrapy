const Apify = require('apify');
const { spawn } = require('child_process');
const fs = require('fs');
const tar = require('tar');
const tarfs = require('tar-fs');
const execSync = require('child_process').execSync;

Apify.getValue('INPUT').then((input) => {
  fs.writeFileSync('./actor/spiders/run.py', input.scrapyCode, (err) => {
    if (err) console.log(err);
    console.log('Successfully built scrapy spider.');
  });

  Apify.getValue('jobdir.tgz').then((stream) => {
    if (stream != null) {
      fs.writeFileSync('downloaded.tgz', stream);
      execSync('rm -r ./crawls/');
      fs.createReadStream('downloaded.tgz').pipe(tarfs.extract('./'));
    }

    const jobDir = 'persistentStorage';
    const scrapyList = spawn('scrapy', ['list']);
    const scrapyRun = spawn('xargs', ['-n', '1', 'scrapy', 'crawl', '-s', `JOBDIR=crawls/${jobDir}`]);

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
