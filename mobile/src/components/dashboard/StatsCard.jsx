export default function StatsCard({ label, value, icon, color, sub }) {
  return (
    <div className={`dash-stat-card ${color || ""}`}>
      <span className="dash-stat-icon">{icon}</span>
      <div className="dash-stat-info">
        <span className="dash-stat-value">{value}</span>
        <span className="dash-stat-label">{label}</span>
        {sub && <span className="dash-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}
