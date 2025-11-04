export const runSeed = async () => {
  // placeholder seed
  return { seeded: true };
};

if (require.main === module) {
  runSeed().then(() => /* eslint-disable-next-line no-console */ console.log('Seed complete'));
}
