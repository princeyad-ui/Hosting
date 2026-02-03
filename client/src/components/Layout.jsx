import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, onSearch = null }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar onSearch={onSearch} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
