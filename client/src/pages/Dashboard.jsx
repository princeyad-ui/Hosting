import Layout from "../components/Layout";
import StatsCard from "../components/StatsCard";
import SiteCard from "../components/SiteCard";
import { useEffect, useState } from "react";
import "../styles/dashboard.css";
import { API } from "../utils/api";


export default function Dashboard() {
  const [sites, setSites] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);

  /* ===============================
     FETCH SITES (JWT PROTECTED)
  ================================ */
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
      setSites([]);
    }
  };

  /* ===============================
     FETCH STORAGE INFO
  ================================ */
  const fetchStorageInfo = async () => {
    try {
      const res = await fetch(`${API}/user/storage-info`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setStorageInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage info:", err);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchStorageInfo();
    const interval = setInterval(() => {
      fetchSites();
      fetchStorageInfo();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalSites = sites.length;
  const activeDeploys = sites.filter(
    site => site.status?.toLowerCase() === "live"
  ).length;

  const usedStorage = storageInfo?.usedStorageMB || totalSites * 40;
  const needsPayment = storageInfo?.requiresPayment || false;

  return (
    <Layout>
      {/* ================= PAYMENT WARNING ================= */}
      {needsPayment && (
        <div className="payment-warning">
          <strong>⚠️ Storage Limit Reached!</strong> You've used {usedStorage}MB of 200MB free storage. 
          <a href="/deploy" style={{ marginLeft: "10px" }}>
            Upgrade or deploy with paid plan →
          </a>
        </div>
      )}

      {/* ================= STATS ================= */}
      <div className="stats-grid">
        <StatsCard title="Total Sites" value={totalSites} type="sites" />
        <StatsCard title="Active Deploys" value={activeDeploys} type="deploys" />
        <StatsCard
          title="Build Status"
          value={activeDeploys > 0 ? "Success" : "—"}
          type="status"
        />
        <StatsCard
          title="Storage Used"
          value={`${usedStorage} / 200 MB`}
          type="storage"
        />
      </div>

      {/* ================= SITES ================= */}
      <div className="site-grid">
        {sites.length === 0 && (
          <p className="empty">No sites deployed yet</p>
        )}

        {sites.map(site => (
          <SiteCard
            key={site.id}
            name={site.name}
            status={site.status}
            url={site.url}
          />
        ))}
      </div>
    </Layout>
  );
}
