import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIMES, PLACES, WORLD_HEIGHT, WORLD_WIDTH, artworkForTime,
} from '../src/content/places.ts';
import { ENCOUNTERS, encountersFor, findEncounter } from '../src/content/encounters.ts';

test('Four experience periods must preserve only three original HD backgrounds', () => {
  assert.deepEqual(TIMES.map((time) => time.id), ['morning', 'noon', 'dusk', 'night']);
  assert.deepEqual(TIMES.map((time) => time.image), [
    'scene-day.webp', 'scene-day.webp', 'scene-dusk.webp', 'scene-night.webp',
  ]);
  assert.equal(artworkForTime('morning'), 'day');
  assert.equal(artworkForTime('noon'), 'day');
  assert.equal(artworkForTime('dusk'), 'dusk');
  assert.equal(artworkForTime('night'), 'night');
});

test('Story hotspots are unique, reachable and inside the native painting coordinates', () => {
  const ids = new Set();
  for (const encounter of ENCOUNTERS) {
    assert.ok(!ids.has(encounter.id), `duplicate encounter ${encounter.id}`);
    ids.add(encounter.id);
    assert.ok(TIMES.some((time) => time.id === encounter.time), 'valid period');
    assert.ok(PLACES.some((place) => place.id === encounter.place), 'valid landmark');
    assert.ok(/^npc-[a-z]+\.webp$/.test(encounter.spriteFile), 'sprite maps to compact resource');
    assert.ok(encounter.spriteWidth >= 55 && encounter.spriteWidth <= 125, 'story art remains a small scene detail');
    assert.ok(encounter.worldX >= 0 && encounter.worldX <= WORLD_WIDTH, 'x within scroll');
    assert.ok(encounter.worldY >= 0 && encounter.worldY <= WORLD_HEIGHT, 'y within scroll');
    assert.equal(findEncounter(encounter.id), encounter);
    assert.ok(encounter.intro && encounter.detail, 'accessible copy and demo disclaimer');
    for (const choice of encounter.choices) {
      assert.ok(choice.label && choice.answer, 'each choice returns a visible response');
      if (choice.navigateTo) assert.ok(PLACES.some((place) => place.id === choice.navigateTo));
    }
  }
  assert.equal(ids.size, 4);
});

test('Interaction slots are restricted to matching times of day', () => {
  assert.deepEqual(encountersFor('morning').map((x) => x.id), ['fisher']);
  assert.deepEqual(encountersFor('noon').map((x) => x.id), ['cormorant', 'fishmarket']);
  assert.deepEqual(encountersFor('dusk').map((x) => x.id), []);
  assert.deepEqual(encountersFor('night').map((x) => x.id), ['night-stage']);
});

test('Morning directions, noon fishing and market, night show controls remain available', () => {
  const fisher = findEncounter('fisher');
  assert.ok(fisher.choices.some((x) => x.navigateTo === 'elephant'));
  assert.ok(findEncounter('cormorant').choices.some((x) => x.splash));
  assert.ok(findEncounter('fishmarket').choices.some((x) => x.id === 'buy-fish'));
  assert.equal(findEncounter('night-stage').choices.length, 0, 'night view uses separate accessible React controls');
});
