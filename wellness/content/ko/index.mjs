// ERKAK · ko · assembles all texts of the language into one object.
import { meta, units, nouns, ui, client, goals, regions } from './ui.mjs';
import { directions, programs, destinations } from './catalog.mjs';
import fishing from './fishing.mjs';
import { hub, site, places, guidesPage, about, legal } from './site.mjs';
import guides from './guides.mjs';
import ring from './ring.mjs';

export default { meta, units, nouns, ui, client, goals, regions, catalog:{ directions, programs, destinations }, fishing, hub, site, places, guidesPage, about, legal, guides, ring };
