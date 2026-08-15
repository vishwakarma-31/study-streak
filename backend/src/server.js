const app = require('./app');
const connectDB = require('./config/db');
const { startMidnightCron } = require('./cron/dailyFinalization');

const PORT = process.env.PORT || 5000;

async function main() {
  await connectDB();
  startMidnightCron();
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

main().catch((err) => {
  console.error('startup failed:', err);
  process.exit(1);
});
