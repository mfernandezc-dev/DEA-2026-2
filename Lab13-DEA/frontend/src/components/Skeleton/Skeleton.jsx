function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`.trim()} aria-hidden="true">
      <div className="skeleton-block skeleton-poster" />
      <div className="skeleton-details">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-line" />
        <div className="skeleton-block skeleton-line" />
        <div className="skeleton-block skeleton-line skeleton-line--short" />
      </div>
    </div>
  )
}

export default Skeleton
