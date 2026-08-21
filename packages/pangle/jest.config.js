module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'app.plugin.js',
    '!src/**/*.test.ts',
    '!src/specs/**',
  ],
  coverageReporters: ['text'],
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      {
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
};
