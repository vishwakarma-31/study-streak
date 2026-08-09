require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Roadmap = require('../models/Roadmap');
const roadmapData = require('./roadmap.json');

async function seedRoadmap() {
  await mongoose.connect(process.env.MONGO_URI);

  let inserted = 0;
  let updated = 0;
  for (const phase of roadmapData) {
    const result = await Roadmap.updateOne(
      { phaseNumber: phase.phaseNumber },
      { $set: phase },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted += 1;
    else updated += 1;
  }

  console.log(`Roadmap seeded: ${inserted} inserted, ${updated} updated`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seedRoadmap().catch((err) => {
    console.error('seeding failed:', err);
    process.exit(1);
  });
}
