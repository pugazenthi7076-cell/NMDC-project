// Seed script - Run once to populate MongoDB with initial data
// Usage: npx tsx src/lib/seed.ts

import connectDB from "./mongodb";
import {
  User,
  Belt,
  Detection,
  Prediction,
  AlertModel,
  AnalysisRecord,
  ThermalReading,
} from "./models";
import {
  mockBelts,
  mockDetections,
  mockPredictions,
  mockAlerts,
  mockAnalysisData,
  mockThermalData,
} from "./mock-data";

async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await connectDB();
  console.log("✅ Connected to MongoDB\n");

  // Seed Users
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log("👤 Seeding users...");
    await User.create({
      id: "ADM-0001",
      name: "Super Admin",
      email: "admin@nmdc.in",
      mobile: "9999999999",
      role: "admin",
      department: "System Administration",
      designation: "System Administrator",
      sectionHead: "Director - IT",
      password: "admin",
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    console.log("  ✅ Default admin created (ADM-0001 / admin)");
  } else {
    console.log(`  ℹ️  Users already exist (${userCount}), skipping`);
  }

  // Seed Belts
  const beltCount = await Belt.countDocuments();
  if (beltCount === 0) {
    console.log("🏭 Seeding belts...");
    await Belt.insertMany(mockBelts);
    console.log(`  ✅ ${mockBelts.length} belts inserted`);
  } else {
    console.log(`  ℹ️  Belts already exist (${beltCount}), skipping`);
  }

  // Seed Detections
  const detCount = await Detection.countDocuments();
  if (detCount === 0) {
    console.log("🔍 Seeding detections...");
    await Detection.insertMany(mockDetections);
    console.log(`  ✅ ${mockDetections.length} detections inserted`);
  } else {
    console.log(`  ℹ️  Detections already exist (${detCount}), skipping`);
  }

  // Seed Predictions
  const predCount = await Prediction.countDocuments();
  if (predCount === 0) {
    console.log("📈 Seeding predictions...");
    await Prediction.insertMany(mockPredictions);
    console.log(`  ✅ ${mockPredictions.length} predictions inserted`);
  } else {
    console.log(`  ℹ️  Predictions already exist (${predCount}), skipping`);
  }

  // Seed Alerts
  const alertCount = await AlertModel.countDocuments();
  if (alertCount === 0) {
    console.log("🔔 Seeding alerts...");
    await AlertModel.insertMany(mockAlerts);
    console.log(`  ✅ ${mockAlerts.length} alerts inserted`);
  } else {
    console.log(`  ℹ️  Alerts already exist (${alertCount}), skipping`);
  }

  // Seed Analysis Records
  const analCount = await AnalysisRecord.countDocuments();
  if (analCount === 0) {
    console.log("📊 Seeding analysis records...");
    await AnalysisRecord.insertMany(mockAnalysisData);
    console.log(`  ✅ ${mockAnalysisData.length} analysis records inserted`);
  } else {
    console.log(`  ℹ️  Analysis records already exist (${analCount}), skipping`);
  }

  // Seed Thermal Readings
  const thermalCount = await ThermalReading.countDocuments();
  if (thermalCount === 0) {
    console.log("🌡️  Seeding thermal readings...");
    await ThermalReading.insertMany(mockThermalData);
    console.log(`  ✅ ${mockThermalData.length} thermal readings inserted`);
  } else {
    console.log(`  ℹ️  Thermal readings already exist (${thermalCount}), skipping`);
  }

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
