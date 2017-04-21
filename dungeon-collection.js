#!/usr/bin/env node

/**
 *
 * This script searches your account for the dungeon collection skins and outputs the amount of unlocked skins,
 * the amount of required tokens and the amount of tokens still left to collect in order to complete the collection.
 *
 * Make sure to set your API key first in ./config/local.yml (copy ./config/default.yml).
 * Required API permissions: account, wallet, progression.
 *
 * Usage: ./dungeon-collection.js
 *
 */

'use strict';

const config = require('config');
const Promise = require('bluebird');
const api = require('gw2api-client').default();
api.authenticate(config.get('api_key'));

const collectionAchievements = [
    1725, // AC
    1723, // CM
    1721, // TA
    1722, // SE
    1714, // CoF
    1718, // HotW
    1719, // CoE
    1724 // Arah
];

const tokenCurrencies = {
    1725: 5,
    1723: 9,
    1721: 11,
    1722: 10,
    1714: 13,
    1718: 12,
    1719: 14,
    1724: 6
};

const skinCosts = {
    Helm: 180,
    Shoulders: 210,
    Coat: 330,
    Gloves: 180,
    Leggings: 300,
    Boots: 180,
    Axe: 300,
    Dagger: 300,
    Focus: 210,
    Greatsword: 390,
    Hammer: 390,
    Spear: 390,
    Longbow: 390,
    Mace: 300,
    Pistol: 300,
    Rifle: 390,
    Scepter: 210,
    Shield: 210,
    Shortbow: 390,
    Speargun: 390,
    Staff: 390,
    Sword: 300,
    Torch: 210,
    Trident: 390,
    Warhorn: 210
};

Promise.all([
    api.achievements().many(collectionAchievements),
    api.account().achievements().many(collectionAchievements),
    api.account().wallet().get()
]).spread((achievements, accountAchievements, wallet) => {
    const skinIds = achievements.map(a => a.bits.map(b => b.id));

    return Promise.map(skinIds, achievementSkins => api.skins().many(achievementSkins)).then(skins => {
        skins = new Map([].concat.apply([], skins).map(s => [s.id, s]));

        for (let achievement of achievements) {
            // Determine locked / unlocked status
            const accountAchievement = accountAchievements.find(a => a.id === achievement.id);
            const skinsUnlocked = accountAchievement.bits.map(b => achievement.bits[b].id);
            const skinsLocked = achievement.bits.filter(b => skinsUnlocked.indexOf(b.id) === -1).map(b => b.id);

            // Determine dungeon tokens
            const tokensSpent = skinsUnlocked.map(id => skinCosts[skins.get(id).details.type]).reduce((a, b) => a + b);
            const tokensLeft = skinsLocked.map(id => skinCosts[skins.get(id).details.type]).reduce((a, b) => a + b);
            const tokensOwned = wallet.find(c => c.id === tokenCurrencies[achievement.id]).value;

            // Output
            console.log(`${achievement.name}:`);
            console.log(` - Unlocked Skins: ${skinsUnlocked.length}/${skinsUnlocked.length + skinsLocked.length}`);
            console.log(` - Tokens required: ${tokensLeft.toLocaleString()} (${tokensSpent.toLocaleString()}/${(tokensSpent + tokensLeft).toLocaleString()})`);
            console.log(` - Tokens to collect: ${(tokensLeft < tokensOwned ? 0 : tokensLeft - tokensOwned).toLocaleString()} (${tokensOwned.toLocaleString()}/${tokensLeft.toLocaleString()})`);
            console.log();
        }
    });
}).catch(err => {
    console.error(err);
});
