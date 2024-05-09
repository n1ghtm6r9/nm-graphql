module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
