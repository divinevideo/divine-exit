const pubkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const checks = [
  ["health", "https://api.divine.video/api/health"],
  ["videos", "https://api.divine.video/api/videos"],
  ["privacy", `https://api.divine.video/api/users/${pubkey}/privacy`],
  ["notifications", `https://api.divine.video/api/users/${pubkey}/notifications`],
  ["export", `https://api.divine.video/api/users/${pubkey}/export/events`]
] as const;

for (const [name, url] of checks) {
  const response = await fetch(url);
  console.log(`${name}: ${response.status}`);
}

const exportResponse = await fetch(`https://api.divine.video/api/users/${pubkey}/export/events`);

if (exportResponse.status === 404) {
  console.log("Live signed validation is still gated: export route is not serving yet.");
  process.exit(0);
}

if (exportResponse.status === 401 || exportResponse.status === 403) {
  console.log("Live signed validation may start: export route is serving a NIP-98 response.");
  process.exit(0);
}

console.error(`Unexpected export gate status: ${exportResponse.status}`);
process.exit(1);
