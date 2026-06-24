// Load test scenarios for the Legion platform.
//
// Run a single scenario via the SCENARIO env var, e.g.
//   k6 run --env SCENARIO=smoke_100_users --env BASE_URL=http://staging.example load-tests/k6-platform.js
//   k6 run --env SCENARIO=ramp_1000_users --env BASE_URL=http://staging.example load-tests/k6-platform.js
//   k6 run --env SCENARIO=spike_10000_users --env BASE_URL=http://staging.example load-tests/k6-platform.js
//
// Default (no SCENARIO env) is a short 5-VU local smoke that any laptop can run.
// The 1k and 10k VU scenarios MUST target staging hardware with HikariCP
// tuned (DB_POOL_MAX_SIZE) and observability in place; do not point them at a
// single dev process or in-memory H2.
import http from "k6/http";
import { check, sleep } from "k6";

const SCENARIOS = {
  smoke_5_users_local: {
    executor: "constant-vus",
    vus: 5,
    duration: "20s",
    exec: "publicCatalog",
  },
  smoke_100_users: {
    executor: "constant-vus",
    vus: 100,
    duration: "1m",
    exec: "publicCatalog",
  },
  ramp_1000_users: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 1000 },
      { duration: "3m", target: 1000 },
      { duration: "1m", target: 0 },
    ],
    exec: "publicCatalog",
  },
  spike_10000_users: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 10000 },
      { duration: "2m", target: 10000 },
      { duration: "2m", target: 0 },
    ],
    exec: "publicCatalog",
  },
};

const selected = __ENV.SCENARIO || "smoke_5_users_local";
if (!SCENARIOS[selected]) {
  throw new Error(`Unknown SCENARIO=${selected}; valid: ${Object.keys(SCENARIOS).join(", ")}`);
}

export const options = {
  scenarios: { [selected]: SCENARIOS[selected] },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";

export function publicCatalog() {
  const responses = http.batch([
    ["GET", `${baseUrl}/actuator/health/readiness`],
    ["GET", `${baseUrl}/api/catalog/products`],
    ["GET", `${baseUrl}/api/membership-plans`],
    ["GET", `${baseUrl}/api/classes`],
  ]);

  for (const response of responses) {
    check(response, {
      "status is 2xx": (res) => res.status >= 200 && res.status < 300,
    });
  }
  sleep(1);
}
