import { networkInterfaces } from "node:os";

function getLanIp() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return "127.0.0.1";
}

const url = `exp://${getLanIp()}:8081`;

console.log("\n========================================");
console.log("  OPEN IN EXPO GO (same Wi-Fi)");
console.log("========================================");
console.log(`\n  ${url}\n`);
console.log("In Expo Go: tap 'Enter URL manually' and paste the line above.");
console.log("========================================\n");
