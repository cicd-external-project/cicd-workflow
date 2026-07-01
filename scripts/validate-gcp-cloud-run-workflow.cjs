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
  'health-path',
  'correlation-id',
];

const requiredPatterns = [
  ['workflow_call trigger', /workflow_call:/],
  ['OIDC id-token permission', /id-token:\s+write/],
  ['checkout contents permission', /contents:\s+read/],
  ['Google auth action', /google-github-actions\/auth@/],
  ['gcloud setup action', /google-github-actions\/setup-gcloud@/],
  ['input validation step', /Validate inputs and branch mapping/],
  ['OIDC permission validation', /ACTIONS_ID_TOKEN_REQUEST_URL/],
  ['target project verification', /gcloud projects describe/],
  ['required API verification', /gcloud services list/],
  ['Artifact Registry verification', /gcloud artifacts repositories describe/],
  ['runtime service account verification', /gcloud iam service-accounts describe/],
  ['Docker build step', /docker build\b/],
  ['Artifact Registry push step', /docker push\b/],
  ['image digest resolution', /gcloud artifacts docker images describe/],
  ['Cloud Run deploy step', /gcloud run deploy/],
  ['Cloud Run revision output', /revision-name/],
  ['health probe step', /curl\s+-fsS/],
  ['private Cloud Run health token', /gcloud auth print-identity-token/],
  ['test branch maps to dev', /\$\{BRANCH\}"\s*==\s*"test".*\$\{ENVIRONMENT\}"\s*==\s*"dev"/s],
  ['uat branch maps to uat', /\$\{BRANCH\}"\s*==\s*"uat".*\$\{ENVIRONMENT\}"\s*==\s*"uat"/s],
  ['main branch maps to prod', /\$\{BRANCH\}"\s*==\s*"main".*\$\{ENVIRONMENT\}"\s*==\s*"prod"/s],
  ['preview gate uses explicit environment', /\$\{ENVIRONMENT\}"\s*==\s*"preview".*\$\{ALLOW_PREVIEW\}"\s*==\s*"true"/s],
  ['service URL output', /service-url:/],
  ['image URI output', /image-uri:/],
  ['image digest output', /image-digest:/],
  ['deployment status output', /deployment-status:/],
  ['correlation ID output', /correlation-id:/],
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
