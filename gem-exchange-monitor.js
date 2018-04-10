#!/usr/bin/env node

/**
 *
 * This script is a monitoring tool for the gem exchange rates.
 * It's made to be run in the background. You can use screen for that for example.
 * Every 5 minutes, this script will add the new rates in ./output/coinsToGems.csv and ./output/gemsToCoins.csv.
 * You can see an output example on the gh-pages branch.
 *
 * Usage: ./gem-exchange-monitor.js
 *
 */

'use strict';

const fs = require('fs');
const gw2Api = require('gw2api-client').default();

// We check coins -> gems for the following quantities:
// - 500000
// - 1000000
// - 2500000
// - 100000000 (gw2spidy)
// - A random number between 1000000 and 2500000

// We check gems -> coins for the following quantities:
// - 400
// - 800
// - 1000
// - 1200
// - 2000
// - 100000 (gw2spidy)
// - A random number between 400 and 2000

async function getGems() {
    const randCoins = 1000000 + Math.floor(Math.random() * 1500000);
    const randGems = 400 + Math.floor(Math.random() * 1600);

    const coinsToGems = await Promise.all([
        gw2Api.commerce().exchange().coins(500000),
        gw2Api.commerce().exchange().coins(1000000),
        gw2Api.commerce().exchange().coins(2500000),
        gw2Api.commerce().exchange().coins(100000000),
        gw2Api.commerce().exchange().coins(randCoins)
    ]);
    const gemsToCoins = await Promise.all([
        gw2Api.commerce().exchange().gems(400),
        gw2Api.commerce().exchange().gems(800),
        gw2Api.commerce().exchange().gems(1000),
        gw2Api.commerce().exchange().gems(1200),
        gw2Api.commerce().exchange().gems(2000),
        gw2Api.commerce().exchange().gems(100000),
        gw2Api.commerce().exchange().gems(randGems)
    ]);

    storeGems(coinsToGems, gemsToCoins);
}

function storeGems(coinsToGems, gemsToCoins) {
    if (!fs.existsSync('output/coinsToGems.csv')) {
        fs.writeFileSync('output/coinsToGems.csv', 'Quantity,500000,1000000,2500000,100000000,Random\n');
    }
    if (!fs.existsSync('output/gemsToCoins.csv')) {
        fs.writeFileSync('output/gemsToCoins.csv', 'Quantity,400,800,1000,1200,2000,100000,Random\n');
    }

    const date = Date.now();
    const coinsToGemsCsv = coinsToGems.map(d => d.coins_per_gem * 100).join(',');
    const gemsToCoinsCsv = gemsToCoins.map(d => d.coins_per_gem * 100).join(',');
    fs.writeFileSync('output/coinsToGems.csv', `${date},${coinsToGemsCsv}\n`, { flag: 'a' });
    fs.writeFileSync('output/gemsToCoins.csv', `${date},${gemsToCoinsCsv}\n`, { flag: 'a' });

    console.log(`${new Date(date)}: coins - ${coinsToGemsCsv}; gems - ${gemsToCoinsCsv}`);
}

setInterval(getGems, 5 * 60 * 1000);
getGems();
