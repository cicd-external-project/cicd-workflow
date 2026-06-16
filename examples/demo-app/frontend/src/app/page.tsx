import HealthBadge from '@/components/HealthBadge';
import PipelineRail from '@/components/PipelineRail';
import PromotionLadder from '@/components/PromotionLadder';

export default function Home() {
  return (
    <main id="main-content" className="page">
      <section className="hero">
        <p className="hero__eyebrow">FlowCI Example Project</p>
        <h1 className="hero__title">
          This is a <span className="hero__title-accent">FlowCI</span> demo project
        </h1>
        <p className="hero__sub">
          A small, real Next.js app wired to a real backend, deployed by a real
          three-stage pipeline. It exists to show — not just tell — what FlowCI
          generates the moment a repository is onboarded.
        </p>
        <div className="hero__status">
          <HealthBadge />
        </div>
      </section>

      <PipelineRail />
      <PromotionLadder />

      <footer className="page-footer">
        <p>
          Generated and operated by FlowCI · Access Gate → Quality → Package · test → uat → main
        </p>
      </footer>
    </main>
  );
}
