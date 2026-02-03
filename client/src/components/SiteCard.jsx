import { ExternalLink } from "lucide-react";

export default function SiteCard({ name, status, url }) {
  const isLive = status === "Live";

  return (
    <div className="site-card fade-in">
      <div className="card-top">
        <h3>{name}</h3>

        {/* status dot */}
        <span
          className={`status-dot ${isLive ? "live" : ""}`}
        ></span>
      </div>

      {/* status text */}
      <p className="site-status">
        {status || "Unknown"}
      </p>

      {/* visit link only if live + url exists */}
      {isLive && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="visit-link"
        >
          Visit Site <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
