import { defineConfig } from 'tsup';
export default defineConfig({entry:['src/index.ts'],format:['esm'],platform:'node',target:'node22',noExternal:['@sollu/shared'],sourcemap:true});
