import { PIPELINE_STAGES, formatStageSequence } from '@/lib/pipeline-stages';

/**
 * Horizontal connected-node rail visualizing the three FlowCI pipeline
 * stages. Deliberately not a generic equal-width card grid — nodes sit on a
 * single flowing rail with an animated pulse traveling along the connector,
 * echoing how a real GitHub Actions run chains workflow_run triggers.
 */
export default function PipelineRail() {
  return (
    <section aria-labelledby="pipeline-heading" className="pipeline-rail">
      <div className="section-heading">
        <p className="section-heading__eyebrow">How a push moves through FlowCI</p>
        <h2 id="pipeline-heading" className="section-heading__title">
          One push, three gated stages
        </h2>
        <p className="section-heading__sub">{formatStageSequence(PIPELINE_STAGES)}</p>
      </div>

      <ol className="pipeline-rail__track">
        {PIPELINE_STAGES.map((stage, index) => (
          <li key={stage.id} className="pipeline-node" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="pipeline-node__marker">
              <span className="pipeline-node__code">{stage.code}</span>
            </div>
            <h3 className="pipeline-node__title">{stage.title}</h3>
            <p className="pipeline-node__description">{stage.description}</p>
            <ul className="pipeline-node__detail">
              {stage.detail.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {index < PIPELINE_STAGES.length - 1 ? (
              <span className="pipeline-node__connector" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
