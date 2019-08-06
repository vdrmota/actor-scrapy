const Apify = require('apify');
const { spawn } = require('child_process');
const fs = require('fs');


Apify.getValue('INPUT').then((input) => {
  fs.writeFileSync('./actor/spiders/run.py', input.scrapyCode, (err) => {
    if (err) console.log(err);
    console.log('Successfully built scrapy spider.');
  });

  const jobDir = Apify.isAtHome() ? Apify.getEnv().actorRunId : 'localRun';

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
});
