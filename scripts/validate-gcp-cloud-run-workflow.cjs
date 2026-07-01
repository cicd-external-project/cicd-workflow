const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(
  repoRoot,
  '.github',
  'workflows',
  'gcp-cloud-run-deploy.yml',
);

const callerTemplatePaths = [
  'workflow-templates/fe-nextjs.yml',
  'workflow-templates/fe-react.yml',
  'workflow-templates/be-nodejs.yml',
  'workflow-templates/be-nestjs.yml',
].map((templatePath) => path.join(repoRoot, templatePath));
const allTemplatePaths = [
  ...callerTemplatePaths,
  path.join(repoRoot, 'workflow-templates/standalone-lint.yml'),
];

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


for (const templatePath of callerTemplatePaths) {
  const relativeTemplatePath = path.relative(repoRoot, templatePath);
  if (!fs.existsSync(templatePath)) {
    fail(`missing caller template ${relativeTemplatePath}`);
    continue;
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const callerRequirements = [
    ['GCP deploy job', /deploy-gcp:/],
    ['central GCP reusable workflow', /gcp-cloud-run-deploy\.yml@/],
    ['test dependency before deploy', /needs:\s*\[[^\]]*(unit-tests|test)[^\]]*\]/],
    ['branch to environment mapping', /github\.ref_name\s*==\s*'main'\s*&&\s*'prod'.*github\.ref_name\s*==\s*'uat'\s*&&\s*'uat'.*'dev'/s],
    ['GCP project variable', /gcp-project-id:\s*\$\{\{\s*vars\.ALPHACI_GCP_PROJECT_ID\s*\}\}/],
    ['GCP region variable', /gcp-region:\s*\$\{\{\s*vars\.ALPHACI_GCP_REGION\s*\|\|\s*'asia-southeast1'\s*\}\}/],
    ['Artifact Registry variable', /artifact-registry-repository:\s*\$\{\{\s*vars\.ALPHACI_ARTIFACT_REGISTRY_REPOSITORY\s*\}\}/],
    ['Cloud Run service variable', /cloud-run-service-name:\s*\$\{\{\s*vars\.ALPHACI_CLOUD_RUN_SERVICE\s*\}\}/],
    ['runtime service account variable', /runtime-service-account:\s*\$\{\{\s*vars\.ALPHACI_RUNTIME_SERVICE_ACCOUNT\s*\}\}/],
    ['WIF provider variable', /workload-identity-provider:\s*\$\{\{\s*vars\.ALPHACI_GCP_WORKLOAD_IDENTITY_PROVIDER\s*\}\}/],
    ['deployer service account variable', /deployer-service-account:\s*\$\{\{\s*vars\.ALPHACI_GCP_DEPLOYER_SERVICE_ACCOUNT\s*\}\}/],
  ];

  for (const [label, pattern] of callerRequirements) {
    if (!pattern.test(template)) {
      fail(`${relativeTemplatePath} missing ${label}`);
    }
  }

  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(template)) {
      fail(`${relativeTemplatePath} forbidden ${label}`);
    }
  }

  for (const [label, pattern] of [
    ['Vercel token', /VERCEL_TOKEN|vercel-deploy/i],
    ['Render API key', /RENDER_API_KEY|render-deploy/i],
    ['static gcloud key auth', /gcloud\s+auth\s+activate-service-account/i],
  ]) {
    if (pattern.test(template)) {
      fail(`${relativeTemplatePath} forbidden ${label}`);
    }
  }
}
for (const templatePath of allTemplatePaths) {
  const relativeTemplatePath = path.relative(repoRoot, templatePath);
  const template = fs.readFileSync(templatePath, 'utf8');
  for (const [label, pattern] of [
    ['old central workflow repo', /Tone-Lloyd-Sir-Catubag-CICD\/central-workflow/i],
    ['old stable ref during GCP migration', /@v1\b/],
  ]) {
    if (pattern.test(template)) {
      fail(`${relativeTemplatePath} forbidden ${label}`);
    }
  }
}
if (!process.exitCode) {
  console.log('GCP Cloud Run workflow contract passed');
}
