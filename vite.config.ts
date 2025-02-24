import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  plugins: [
    {
      name: 'raw-glsl',
      transform(code, id) {
        if (id.endsWith('.glsl')) {
          const escapedCode = code
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');
          return {
            code: `export default \`${escapedCode}\`;`,
            map: null
          };
        }
      }
    }
  ]
});