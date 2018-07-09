#!/usr/bin/env node

/**
 *
 * This script verifies that the items in all your inventories against /v2/items.
 *
 * Make sure to set your API key first in ./config/local.yml (copy ./config/default.yml).
 * Required API permissions: account, inventories, characters.
 * Usage: ./missing-items.js
 *
 */

'use strict';

const https = require('https');
const config = require('config');
const gw2Api = require('gw2api-client').default();

function getItemsFromEfficiency(ids) {
    return new Promise((resolve, reject) => {
        const request = https.get(`https://api.gw2efficiency.com/items?ids=${ids.join(',')}`, response => {
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error(`Failed to get page, status code ${response.statusCode}`));
            }
            const body = [];
            response.on('data', chunk => body.push(chunk));
            response.on('end', () => resolve(body.join('')));
        });
        request.on('error', err => reject(err));
    });
}

async function exec() {
    gw2Api.authenticate(config.get('api_key'));

    const missingItems = [];

    const [bank, sharedInventory, characters, itemIds] = await Promise.all([
        gw2Api.account().bank().get(),
        gw2Api.account().inventory().get(),
        gw2Api.characters().all(),
        gw2Api.items().ids().then(ids => new Set(ids))
    ]);

    // Account bank
    for (let i = 0; i < bank.length; i++) {
        const item = bank[i];
        if (item && !itemIds.has(item.id)) {
            missingItems.push({
                id: item.id,
                description: `bank, slot ${i}`
            });
        }
    }

    // Shared inventory
    for (let i = 0; i < sharedInventory.length; i++) {
        const item = sharedInventory[i];
        if (item && !itemIds.has(item.id)) {
            missingItems.push({
                id: item.id,
                description: `shared inventory, slot ${i}`
            });
        }
    }

    for (const character of characters) {
        // Character equipment
        for (const item of character.equipment) {
            if (item && !itemIds.has(item.id)) {
                missingItems.push({
                    id: item.id,
                    description: `equipment ${character.name}, slot ${item.slot}`
                });
            }
        }

        // Character inventory
        for (let i = 0; i < character.bags.length; i++) {
            const bag = character.bags[i];
            if (bag) {
                if (!itemIds.has(bag.id)) {
                    missingItems.push({
                        id: bag.id,
                        description: `inventory ${character.name}, bag ${i}`
                    });
                }

                for (let j = 0; j < bag.inventory.length; j++) {
                    const item = bag.inventory[j];
                    if (item && !itemIds.has(item.id)) {
                        missingItems.push({
                            id: item.id,
                            description: `inventory ${character.name}, bag ${i}, slot ${j}`
                        });
                    }
                }
            }
        }
    }

    try {
        const missingItemIds = new Set(missingItems.map(item => item.id));
        const gw2eItems = new Map(JSON.parse(await getItemsFromEfficiency([...missingItemIds])).map(item => [item.id, item]));

        // Print
        for (const item of missingItems) {
            console.log(`${item.id} (${gw2eItems.has(item.id) ? gw2eItems.get(item.id).name : 'UNKNOWN'}): ${item.description}`);
        }
    } catch (err) {
        console.error(err);
    }
}

exec();
