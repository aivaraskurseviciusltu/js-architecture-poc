/* eslint-disable */
export default {
  displayName: 'bff',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/bff',
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|rxjs|passport|passport-jwt|jwks-rsa)/)',
  ],
};
