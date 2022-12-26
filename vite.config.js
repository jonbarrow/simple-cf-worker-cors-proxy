const path = require('path');
const { defineConfig } = require('vite');
const { default: eslint } = require('vite-plugin-eslint');

module.exports = defineConfig({
  plugins: [eslint()],
  build: {
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'),
      name: 'worker',
      formats: ['es'],
      fileName: () => `worker.js`,
    },
  },
});
