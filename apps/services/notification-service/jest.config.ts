/* eslint-disable */
export default {
  displayName: 'notification-service',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/apps/services/notification-service',
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|rxjs)/)',
  ],
};
