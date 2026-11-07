import { register } from 'node:module';

register('./alias-hook.mjs', { parentURL: import.meta.url });
