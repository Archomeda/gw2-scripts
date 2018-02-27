#!/usr/bin/env node

/**
 *
 * This script verifies your account for all locked and unlocked mastery points.
 *
 * Make sure to set your API key first in ./config/local.yml (copy ./config/default.yml).
 * Required API permissions: account, progression.
 *
 * Usage: ./mastery-point-achievements.js
 *
 */

'use strict';

Set.prototype.difference = function(setB) {
    var difference = new Set(this);
    for (var elem of setB) {
        difference.delete(elem);
    }
    return difference;
};

(async function() {
    const config = require('config');
    const api = require('gw2api-client').default();
    api.authenticate(config.get('api_key'));

    const achievementIds = await api.achievements().ids();
    const achievementIdsSplit = achievementIds
        .map((e, i) => i % 200 === 0 ? achievementIds.slice(i, i + 200) : null)
        .filter(i => i);

    const achievements = (await Promise.all(achievementIdsSplit.map(a => api.achievements().many(a))))
        .reduce((a, b) => a.concat(b), []);

    const masteriesRegion = new Map();
    const masteries = new Map();
    for (let achievement of achievements) {
        const mastery = achievement.rewards ? achievement.rewards.find(r => r.type === 'Mastery') : null;
        if (!mastery) {
            continue;
        }
        if (!masteries.has(mastery.id)) {
            masteries.set(mastery.id, []);
        }
        if (!masteriesRegion.has(mastery.region)) {
            masteriesRegion.set(mastery.region, []);
        }
        masteriesRegion.get(mastery.region).push(achievement);
        masteries.get(mastery.id).push(achievement);
    }
    
    const [accountAchievements, accountPoints] = await Promise.all([
        api.account().achievements().get(),
        api.account().mastery().points().get()
    ]);
    const unlocked = accountPoints.unlocked;
    const locked = Array.from(new Set(masteries.keys()).difference(new Set(accountPoints.unlocked))).sort();

    const unlockedIncorrectly = unlocked.filter(m => {
        const accountAchievement = accountAchievements.find(a => masteries.has(m) && masteries.get(m).find(m => m.id === a.id));
        return !accountAchievement || !accountAchievement.done;
    });
    const lockedIncorrectly = locked.filter(m => {
        const accountAchievement = accountAchievements.find(a => masteries.has(m) && masteries.get(m).find(m => m.id === a.id));
        return accountAchievement && accountAchievement.done;
    });

    console.log(`Unlocked incorrectly:`);
    for (let mastery of unlockedIncorrectly) {
        const achievement = masteries.get(mastery);
        if (achievement) {
            console.log(` - ${mastery} -> ${achievement.map(a => `${a.name} (${a.id})`).join(', ')}`);
        } else {
            console.log(` - ${mastery} -> unknown achievement`);
        }
    }
    console.log('');

    console.log(`Locked incorrectly:`);
    for (let mastery of lockedIncorrectly) {
        const achievement = masteries.get(mastery);
        if (achievement) {
            console.log(` - ${mastery} -> ${achievement.map(a => `${a.name} (${a.id})`).join(', ')}`);
        } else {
            console.log(` - ${mastery} -> unknown achievement`);
        }
    }
})();
