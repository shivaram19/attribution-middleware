const { createClient } = require("redis");

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6380/0"
});

client.on("error", (err) => console.error("[redis]", err.message));

let connectPromise = null;
async function getRedis() {
  if (!connectPromise) {
    connectPromise = client.connect().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  await connectPromise;
  return client;
}

module.exports = { getRedis, client };
