// ERKAK · Deutsch: Zusammenführung aller Texte der Sprache in einem Objekt.
import { meta, units, nouns, ui, client, goals, regions } from './ui.mjs';
import { directions, programs, destinations } from './catalog.mjs';
import fishing from './fishing.mjs';
import { hub, site, places, guidesPage, about, legal } from './site.mjs';
import guides from './guides.mjs';
import ring from './ring.mjs';
import privateC from './private.mjs';

export default { meta, units, nouns, ui, client, goals, regions, catalog:{ directions, programs, destinations }, fishing, hub, site, places, guidesPage, about, legal, guides, ring, private:privateC };
