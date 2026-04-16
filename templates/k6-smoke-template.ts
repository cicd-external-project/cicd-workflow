import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const isVercelPreview = /\.vercel\.app(?:\/|$)/i.test(baseUrl);

const configuredStatuses = (__ENV.EXPECTED_STATUSES || '').trim();
const configuredSingleStatus = (__ENV.EXPECTED_STATUS || '').trim();
const statusSource =
  configuredStatuses ||
  (isVercelPreview ? '200,401,403' : configuredSingleStatus || '200');

const allowedStatusCodes = statusSource
  .split(',')
  .map((value: string) => Number(value.trim()))
  .filter((value: number) => Number.isInteger(value) && value >= 100 && value <= 599);

const expectedStatuses = allowedStatusCodes.length > 0 ? allowedStatusCodes : [200];
const statusLabel = expectedStatuses.join('|');

http.setResponseCallback(http.expectedStatuses(...expectedStatuses));

type SmokeResponse = {
  status: number;
  timings: {
    duration: number;
  };
};

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
  scenarios: {
    smoke_homepage: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_VUS || 1),
      duration: __ENV.K6_DURATION || '30s',
      tags: { scenario: 'smoke_homepage' },
    },
  },
};

export default function smoke() {
  const response = http.get(`${baseUrl}/`);

  check(response, {
    [`status is ${statusLabel}`]: (result: SmokeResponse) => expectedStatuses.includes(result.status),
    'response time < 1000ms': (result: SmokeResponse) => result.timings.duration < 1000,
  });

  sleep(1);
}
