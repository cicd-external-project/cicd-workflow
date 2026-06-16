import {
  PIPELINE_STAGES,
  PROMOTION_STEPS,
  describeNextStage,
  describePromotionProgress,
  formatStageSequence,
} from './pipeline-stages';

describe('formatStageSequence', () => {
  it('joins stage titles with an arrow separator', () => {
    expect(formatStageSequence(PIPELINE_STAGES)).toBe('Access Gate → Quality → Package');
  });

  it('returns an empty string for an empty list', () => {
    expect(formatStageSequence([])).toBe('');
  });

  it('joins a single stage without a separator', () => {
    expect(formatStageSequence([PIPELINE_STAGES[0]])).toBe('Access Gate');
  });
});

describe('describeNextStage', () => {
  it('names the quality stage as next after access', () => {
    expect(describeNextStage('access')).toBe('Next: Quality stage runs automatically.');
  });

  it('names the package stage as next after quality', () => {
    expect(describeNextStage('quality')).toBe('Next: Package stage runs automatically.');
  });

  it('reports completion after the final package stage', () => {
    expect(describeNextStage('package')).toBe(
      'This is the final stage — a green run promotes the branch.',
    );
  });

  it('throws on an unrecognized stage id', () => {
    expect(() => describeNextStage('bogus' as 'access')).toThrow(
      'Unknown pipeline stage id: bogus',
    );
  });
});

describe('PIPELINE_STAGES', () => {
  it('defines three stages with non-empty detail lists', () => {
    expect(PIPELINE_STAGES).toHaveLength(3);
    PIPELINE_STAGES.forEach((stage) => {
      expect(stage.detail.length).toBeGreaterThan(0);
    });
  });
});

describe('describePromotionProgress', () => {
  it('describes the first step', () => {
    expect(describePromotionProgress('test')).toBe('Step 1 of 3 — test');
  });

  it('describes the middle step', () => {
    expect(describePromotionProgress('uat')).toBe('Step 2 of 3 — uat');
  });

  it('describes the final step', () => {
    expect(describePromotionProgress('main')).toBe('Step 3 of 3 — main');
  });

  it('throws on an unrecognized step id', () => {
    expect(() => describePromotionProgress('bogus' as 'test')).toThrow(
      'Unknown promotion step id: bogus',
    );
  });
});

describe('PROMOTION_STEPS', () => {
  it('defines the test, uat, main ladder in order', () => {
    expect(PROMOTION_STEPS.map((step) => step.id)).toEqual(['test', 'uat', 'main']);
  });
});
