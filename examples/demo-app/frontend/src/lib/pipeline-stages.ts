export interface PipelineStage {
  id: 'access' | 'quality' | 'package';
  code: string;
  title: string;
  description: string;
  detail: string[];
}

/**
 * The three stages FlowCI generates for every onboarded repository, in
 * execution order. Each stage is its own `workflow_run`-chained GitHub
 * Actions workflow: Access gates the run, Quality enforces tests/lint/
 * security/coverage, and Package builds and deploys.
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'access',
    code: '00',
    title: 'Access Gate',
    description: 'Validates the run is authorized by FlowCI before anything else executes.',
    detail: ['Verifies repo registration', 'Checks branch policy', 'Stamps the run as trusted'],
  },
  {
    id: 'quality',
    code: '10',
    title: 'Quality',
    description: 'Runs tests, lint, security scanning, and coverage enforcement.',
    detail: ['Lint + typecheck', 'Unit tests + coverage gate', 'Dependency + security scan'],
  },
  {
    id: 'package',
    code: '20',
    title: 'Package',
    description: 'Builds the app and deploys it, promoting test → uat → main on green runs.',
    detail: ['Production build', 'Deploy to environment', 'Promote branch on green'],
  },
];

/**
 * Renders the pipeline stages as an arrow-joined summary string, e.g.
 * "Access Gate → Quality → Package". Returns an empty string for an empty
 * list so callers can render a fallback without special-casing the join
 * result.
 */
export function formatStageSequence(stages: PipelineStage[]): string {
  if (stages.length === 0) {
    return '';
  }

  return stages.map((stage) => stage.title).join(' → ');
}

/**
 * Builds a short greeting that names the next stage to run after the given
 * stage id, used for the "what happens next" copy on the demo page. Returns
 * a completion message once `package` (the final stage) is reached, and
 * throws on an unrecognized id so a typo never silently renders nothing.
 */
export function describeNextStage(currentStageId: PipelineStage['id']): string {
  const index = PIPELINE_STAGES.findIndex((stage) => stage.id === currentStageId);

  if (index === -1) {
    throw new Error(`Unknown pipeline stage id: ${currentStageId}`);
  }

  const next = PIPELINE_STAGES[index + 1];

  return next
    ? `Next: ${next.title} stage runs automatically.`
    : 'This is the final stage — a green run promotes the branch.';
}

export interface PromotionStep {
  id: 'test' | 'uat' | 'main';
  label: string;
  description: string;
}

/**
 * The branch promotion ladder every FlowCI pipeline run climbs on green:
 * test → uat → main. Rendered as an ascending staircase on the demo page.
 */
export const PROMOTION_STEPS: PromotionStep[] = [
  { id: 'test', label: 'test', description: 'Feature and bugfix branches merge here first.' },
  { id: 'uat', label: 'uat', description: 'Auto-promoted from test on a green pipeline run.' },
  { id: 'main', label: 'main', description: 'Auto-promoted from uat on a green pipeline run.' },
];

/**
 * Builds the "X of Y" progress label for the promotion ladder, e.g.
 * "Step 2 of 3 — uat". Throws on an unrecognized id so a typo never
 * silently renders a blank progress label.
 */
export function describePromotionProgress(currentStepId: PromotionStep['id']): string {
  const index = PROMOTION_STEPS.findIndex((step) => step.id === currentStepId);

  if (index === -1) {
    throw new Error(`Unknown promotion step id: ${currentStepId}`);
  }

  return `Step ${index + 1} of ${PROMOTION_STEPS.length} — ${PROMOTION_STEPS[index].label}`;
}
