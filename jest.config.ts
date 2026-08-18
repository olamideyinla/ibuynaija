import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Use Node-compatible module resolution inside tests
        moduleResolution: 'node',
        module: 'commonjs',
      },
    }],
  },
  moduleNameMapper: {
    // Mirror the @/ path alias from tsconfig
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};

export default config;
