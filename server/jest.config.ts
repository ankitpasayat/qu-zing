import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Entry point - tested via integration
    '!src/workers/**/*.ts', // Worker threads - isolated entry points, logic tested elsewhere
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true, // Force Jest to exit after all tests complete
};

export default config;
