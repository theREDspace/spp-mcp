module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  // Without this, testRegex also matches git worktree copies under .claude/,
  // so the whole suite runs twice and tests from an abandoned branch execute
  // alongside the real ones — able to fail the run, or to mask a real failure.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/\\.claude/'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
