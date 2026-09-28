// ERKAK · 简体中文：把本语言的全部文本汇总为一个对象。
import { meta, units, nouns, ui, client, goals, regions } from './ui.mjs';
import { directions, programs, destinations } from './catalog.mjs';
import fishing from './fishing.mjs';
import { hub, site, places, guidesPage, about, legal } from './site.mjs';
import guides from './guides.mjs';

export default { meta, units, nouns, ui, client, goals, regions, catalog:{ directions, programs, destinations }, fishing, hub, site, places, guidesPage, about, legal, guides };
