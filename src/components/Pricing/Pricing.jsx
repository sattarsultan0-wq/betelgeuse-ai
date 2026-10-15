import PlanCards from './PlanCards';

export default function Pricing() {
  return (
    <section className="pricing section container" id="pricing">
      <div className="section-heading">
        <div>
          <h2>
            ВЫБЕРИ СВОЙ УРОВЕНЬ
            <br />
            <span className="dim">ТВОРЧЕСТВА.</span>
          </h2>
        </div>
        <p>
          Твой ритм. Твои возможности.
          <br />
          Твой следующий большой проект.
        </p>
      </div>
      <PlanCards />
    </section>
  );
}
