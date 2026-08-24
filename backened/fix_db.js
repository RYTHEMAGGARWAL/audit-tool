const mongoose = require('mongoose');

// Password ab code mein nahi — .env file se aayega. Root mein .env file banao aur ye line daalo:
// MONGODB_URI=mongodb+srv://<user>:<password>@niit-audit-cluster.tn2rvlx.mongodb.net/niit_audit?retryWrites=true&w=majority&appName=niit-audit-cluster
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI env variable set nahi hai. .env file check karo.');
  process.exit(1);
}

async function fix() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const centers = db.collection('centers');
  const reports = db.collection('auditreports');

  // Show ALL centers and their placement fields
  const allCenters = await centers.find({}).toArray();
  console.log('\n📋 ALL Centers:');
  allCenters.forEach(c => {
    console.log(`  ${c.centerCode} | ${c.centerName} | PC: "${c.placementCoordinator}" | NHP: "${c.nationalHeadPlacement}"`);
  });

  // Show ALL reports and their placement fields
  const allReports = await reports.find({}).toArray();
  console.log('\n📋 ALL Reports:');
  allReports.forEach(r => {
    console.log(`  ${r.centerCode} | ${r.centerName} | PC: "${r.placementCoordinator}" | NHP: "${r.nationalHeadPlacement}"`);
  });

  // Fix ALL documents where PC=Vikrant and NHP=Payal (swap them)
  console.log('\n🔧 Fixing all swapped records...');
  
  const cFix = await centers.updateMany(
    { placementCoordinator: { $regex: /vikrant/i } },
    [{ $set: {
      placementCoordinator: '$nationalHeadPlacement',
      nationalHeadPlacement: '$placementCoordinator'
    }}]
  );
  console.log('✅ Centers fixed:', cFix.modifiedCount);

  const rFix = await reports.updateMany(
    { placementCoordinator: { $regex: /vikrant/i } },
    [{ $set: {
      placementCoordinator: '$nationalHeadPlacement',
      nationalHeadPlacement: '$placementCoordinator'
    }}]
  );
  console.log('✅ Reports fixed:', rFix.modifiedCount);

  // Verify
  console.log('\n✅ AFTER FIX:');
  const allC2 = await centers.find({}).toArray();
  allC2.forEach(c => {
    console.log(`  ${c.centerCode} | ${c.centerName} | PC: "${c.placementCoordinator}" | NHP: "${c.nationalHeadPlacement}"`);
  });

  await mongoose.disconnect();
  console.log('\n🎉 Done!');
}
fix().catch(e => { console.error('❌', e.message); process.exit(1); });