import {
  Globe,
  Rocket,
  CheckCircle,
  Database
} from "lucide-react";

const icons = {
  sites: Globe,
  deploys: Rocket,
  status: CheckCircle,
  storage: Database,
};

export default function StatsCard({ title, value, type }) {
  const Icon = icons[type];

  return (
    <div className="stats-card">
      <div className="stats-header">
        <span className="stats-title">{title}</span>
        {Icon && <Icon size={18} className="stats-icon" />}
      </div>

      <div className="stats-value">
        {value !== undefined ? value : "—"}
      </div>
    </div>
  );
}
