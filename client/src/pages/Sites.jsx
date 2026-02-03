import Layout from "../components/Layout";
import { ExternalLink, Globe, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import "../styles/sites.css";

const API = "http://localhost:5000/api";

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchSites = async () => {
    try {
      const res = await fetch(`${API}/sites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    const data = await res.json();

if (!res.ok || !Array.isArray(data)) {
  setSites([]);
  return;
}

setSites(data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSites();
    const interval = setInterval(fetchSites, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <Layout onSearch={setSearch}>
      <div className="sites-page">
        <div className="sites-header">
          <h2>Your Sites</h2>
          <p>All your deployed frontend projects in one place.</p>
        </div>

        <div className="sites-grid">
          {filteredSites.length === 0 && (
            <p className="empty">
              No sites found{debouncedSearch && ` for "${debouncedSearch}"`}
            </p>
          )}

          {filteredSites.map(site => (
            <SiteItem key={site.id} site={site} refresh={fetchSites} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

function SiteItem({ site, refresh }) {
  const { id, name, url, status } = site;

  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [redeploying, setRedeploying] = useState(false);

  const copyToClipboard = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const deleteSite = async () => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    setDeleting(true);
    await fetch(`${API}/sites/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    setDeleting(false);
    refresh();
  };

  const redeploySite = async () => {
    if (!window.confirm(`Redeploy "${name}"?`)) return;

    setRedeploying(true);
    await fetch(`${API}/sites/${id}/redeploy`, {   // ✅ FIXED HERE
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    setRedeploying(false);
    refresh();
  };

  const isBusy =
    status === "Cloning" ||
    status === "Building" ||
    status === "Redeploying";

  return (
    <div className="site-item">
      <div className="site-left">
        <Globe size={20} />
        <div className="site-info">
          <h3>{name}</h3>

          {url && (
            <div className="site-url-row">
              <a href={url} target="_blank" rel="noreferrer" className="site-url">
                {url}
              </a>
              <button className="copy-btn" onClick={copyToClipboard}>
                <Copy size={14} />
              </button>
              {copied && <span className="copied-text">Copied!</span>}
            </div>
          )}

          <span className={`status ${status?.toLowerCase()}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="site-actions">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="visit-btn">
            Visit <ExternalLink size={14} />
          </a>
        )}

        <button
          className="redeploy-btn"
          onClick={redeploySite}
          disabled={isBusy || redeploying}
        >
          <RefreshCw size={14} />
          {redeploying ? "Redeploying..." : "Redeploy"}
        </button>

        <button
          className="delete-btn"
          onClick={deleteSite}
          disabled={deleting}
        >
          <Trash2 size={14} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
