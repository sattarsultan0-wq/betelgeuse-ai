export function Star({ className = '' }) {
  return (
    <img src="/images/logo.png" alt="" className={`star ${className}`.trim()} />
  );
}
export default function Brand() {
  return (
    <a href="/#home" className="brand" aria-label="Betelgeuse — главная">
      <Star />
      <span>
        BETELGEUSE<span className="brand-dot">®</span>
      </span>
    </a>
  );
}
