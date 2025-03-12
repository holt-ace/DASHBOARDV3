/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test';
  readonly VITE_API_URL: string;
  readonly VITE_USE_ESBUILD: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}