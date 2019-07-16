const Apify = require('apify');
const { exec } = require('child_process');
const fs = require('fs');


Apify.getValue('INPUT').then((input) => {
  const code = input.scrapyCode;

  fs.writeFileSync('./actor/spiders/run.py', code, (err) => {
    if (err) console.log(err);
    console.log('Successfully built scrapy spider.');
  });

  exec('scrapy list | xargs -n 1 scrapy crawl', (err, stdout, stderr) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log(`${stderr}`);
    console.log(`${stdout}`);
  });
});
