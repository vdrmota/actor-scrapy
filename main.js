const Apify = require('apify');
const exec = require('await-exec');
const fs = require('fs');

Apify.main(async () => {
    console.dir(await Apify.getEnv());
    const input = await Apify.getValue('INPUT');
    const code = input.scrapyCode;

    fs.writeFileSync("./actor/spiders/run.py", code, (err) => {
        if (err) console.log(err);
        console.log("Successfully built scrapy spider.");
    });

    await exec('scrapy list | xargs -n 1 scrapy crawl', (err, stdout, stderr) => {
    if (err) {
        console.log(err)
        return;
    }

    console.log(`${stderr}`)
    console.log(`${stdout}`);
    });

    console.log("Scrapy processes finished!")
});