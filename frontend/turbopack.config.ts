// Turbopack config to mirror webpack client-side module exclusions
const config = {
  resolve: {
    // Prevent bundling Node/Electron modules in the client build (same as webpack config)
    alias: {
      electron: false,
      fs: false,
      path: false,
      child_process: false,
      net: false,
      tls: false,
      os: false,
      module: false,
    },
  },
};

export default config;
