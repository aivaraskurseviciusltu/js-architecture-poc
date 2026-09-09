const { workspaceRoot } = require('@nx/devkit');
const path = require('path');

module.exports = {
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '@poc/shared-types': path.join(workspaceRoot, 'libs/shared-types/src/index.ts'),
    '@poc/messaging': path.join(workspaceRoot, 'libs/messaging/src/index.ts'),
  },
};
