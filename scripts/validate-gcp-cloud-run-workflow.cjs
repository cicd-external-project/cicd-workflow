const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(
  repoRoot,
  '.github',
  'workflows',
  'gcp-cloud-run-deploy.yml',
);

const requiredInputs = [
  'system-name',
  'working-directory',
  'checkout-ref',
  'source-branch',
  'environment',
  'gcp-project-id',
  'gcp-region',
  'workload-identity-provider',
  'deployer-service-account',
  'artifact-registry-repository',
  'image-name',
  'cloud-run-service-name',
  'runtime-service-account',
  'docker-context',
  'dockerfile-path',
  'allow-preview',
];

const requiredPatterns = [
  ['workflow_call trigger', /workflow_call:/],
  ['OIDC id-token permission', /id-token:\s+write/],
  ['checkout contents permission', /contents:\s+read/],
  ['Google auth action', /google-github-actions\/auth@/],
  ['gcloud setup action', /google-github-actions\/setup-gcloud@/],
  ['Docker build step', /docker build\b/],
  ['Artifact Registry push step', /docker push\b/],
  ['Cloud Run deploy step', /gcloud run deploy/],
  ['health probe step', /curl\s+-fsS/],
  ['branch gate', /\["test","uat","main"\]/],
  ['preview gate', /allow-preview/],
  ['no secret printing marker', /set \+x/],
];

const forbiddenPatterns = [
  ['static service account key env', /GOOGLE_APPLICATION_CREDENTIALS/],
  ['JSON service account key', /service_account_key|service-account-key/i],
  ['credential file creation', /credentials_json|GCP_CREDENTIALS|GCLOUD_SERVICE_KEY/i],
  ['environment dump', /\b(printenv|env\s*>|env\s*\|)\b/],
];

function fail(message) {
  console.error(`GCP Cloud Run workflow contract failed: ${message}`);
  process.exitCode = 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (!fs.existsSync(workflowPath)) {
  fail(`missing ${path.relative(repoRoot, workflowPath)}`);
  process.exit();
}

const workflow = fs.readFileSync(workflowPath, 'utf8');

for (const input of requiredInputs) {
  const inputPattern = new RegExp(`^\\s{6,}${escapeRegExp(input)}:\\s*$`, 'm');
  if (!inputPattern.test(workflow)) {
    fail(`missing workflow_call input ${input}`);
  }
}

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(workflow)) {
    fail(`missing ${label}`);
  }
}

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(workflow)) {
    fail(`forbidden ${label}`);
  }
}

if (!process.exitCode) {
  console.log('GCP Cloud Run workflow contract passed');
}
