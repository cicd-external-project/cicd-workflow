import { PROMOTION_STEPS, describePromotionProgress } from '@/lib/pipeline-stages';

/**
 * Vertical ascending staircase visualizing the test → uat → main branch
 * promotion flow. Rendered as a staircase (each step wider and higher than
 * the last) rather than a horizontal row, so it reads as "climbing toward
 * production" at a glance — the distinctive visual signature for this
 * section.
 */
export default function PromotionLadder() {
  return (
    <section aria-labelledby="promotion-heading" className="promotion-ladder">
      <div className="section-heading">
        <p className="section-heading__eyebrow">Every green run promotes the branch</p>
        <h2 id="promotion-heading" className="section-heading__title">
          test → uat → main
        </h2>
        <p className="section-heading__sub">{describePromotionProgress('main')}</p>
      </div>

      <ol className="promotion-ladder__steps">
        {PROMOTION_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="promotion-step"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="promotion-step__riser" aria-hidden="true" />
            <div className="promotion-step__plate">
              <span className="promotion-step__index">{index + 1}</span>
              <div>
                <p className="promotion-step__label">{step.label}</p>
                <p className="promotion-step__description">{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
