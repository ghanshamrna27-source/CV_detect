import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  UserCircle,
  PanelLeft,
  ChevronDown,
  Sliders,
  LogOut,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  ShieldAlert,
  FileCheck2,
  Database,
  CheckCircle2
} from "lucide-react";
import { useAssurance } from "../../context/AssuranceContext";

export const TopBar: React.FC = () => {
  const {
    user,
    logout,
    searchQuery,
    setSearchQuery,
    datasets = [],
    models = [],
    findings = [],
    reports = [],
    setActiveTab,
    setSelectedDataset,
    setSelectedModel,
    setSelectedFinding,
    setSelectedReport,
    toggleSidebar,
    setIsMobileDrawerOpen,
    settings,
    updateSettings,
    openDrawer
  } = useAssurance();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  const isDark = settings.theme === "dark";

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (notificationContainerRef.current && !notificationContainerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter search matches dynamically across datasets, models, findings, and reports
  const searchResults = searchQuery.trim()
    ? [
        ...datasets
          .filter((d) => d && (d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.id?.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((d) => ({ type: "dataset" as const, id: d.id, title: d.name, subtitle: `Dataset · ${d.samplesCount} samples`, data: d })),
        ...models
          .filter((m) => m && (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.id?.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((m) => ({ type: "model" as const, id: m.id, title: m.name, subtitle: `Model · ${m.framework}`, data: m })),
        ...findings
          .filter((f) => f && (f.id?.toLowerCase().includes(searchQuery.toLowerCase()) || f.asset?.toLowerCase().includes(searchQuery.toLowerCase()) || f.category?.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((f) => ({ type: "finding" as const, id: f.id, title: f.id, subtitle: `${f.category} · ${f.asset}`, data: f })),
        ...reports
          .filter((r) => r && (r.id?.toLowerCase().includes(searchQuery.toLowerCase()) || r.title?.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((r) => ({ type: "report" as const, id: r.id, title: r.id, subtitle: r.title, data: r }))
      ].slice(0, 6)
    : [];

  const handleSearchResultClick = (item: any) => {
    try {
      setSearchQuery("");
      setIsSearchFocused(false);
      if (item.type === "dataset" && setSelectedDataset) {
        setSelectedDataset(item.data);
        setActiveTab("dataset-results");
      } else if (item.type === "model" && setSelectedModel) {
        setSelectedModel(item.data);
        setActiveTab("model-results");
      } else if (item.type === "finding" && setSelectedFinding) {
        setSelectedFinding(item.data);
        setActiveTab("finding-detail");
      } else if (item.type === "report" && setSelectedReport) {
        setSelectedReport(item.data);
        setActiveTab("reports");
      }
    } catch (err) {
      console.error("Search navigation error handled:", err);
      setIsSearchFocused(false);
    }
  };

  const handleNotificationClick = (n: any) => {
    setShowNotifications(false);
    openDrawer("notification", n);
  };

  const markAllNotificationsRead = () => {
    setNotificationsRead(true);
  };

  return (
    <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors border-b select-none ${
      isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-[#E4EAF0] text-slate-900 shadow-2xs"
    }`}>
      {/* Left: Sidebar Toggle Button & Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hidden lg:flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Toggle Navigation Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar with Live Floating Results */}
        <div ref={searchContainerRef} className="relative w-52 sm:w-80 lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder="Search datasets, models, findings..."
            className={`w-full pl-9 pr-3 py-2 h-9 rounded-lg text-xs font-medium focus:outline-none transition-all ${
              isDark
                ? "bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white"
            }`}
          />

          {/* Search Dropdown Overlay */}
          {isSearchFocused && searchQuery.trim() !== "" && (
            <div className={`absolute left-0 mt-2 w-full rounded-xl border shadow-2xl z-50 p-2 text-xs font-sans ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                Search Results ({searchResults.length})
              </div>

              {searchResults.length > 0 ? (
                <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
                  {searchResults.map((res) => (
                    <div
                      key={`${res.type}-${res.id}`}
                      onClick={() => handleSearchResultClick(res)}
                      className="p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{res.title}</div>
                        <div className="text-[11px] text-slate-500">{res.subtitle}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {res.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No matching assets or findings found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-3 sm:gap-4 font-sans">
        {/* Air-Gapped System Operational Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Operational • Air-Gapped</span>
        </div>

        {/* Notification Bell */}
        <div ref={notificationContainerRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className={`p-2 rounded-lg relative transition-colors ${
              isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
            }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {!notificationsRead && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notification Popover Panel */}
          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-2xl z-50 p-3 font-sans ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center justify-between border-b pb-2 mb-2 font-mono">
                <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  {notificationsRead ? "All Read" : "Mark all as read"}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[
                  { id: "1", icon: ShieldAlert, title: "3 findings require review", asset: "UAV-SURVEILLANCE-01", time: "10m ago" },
                  { id: "2", icon: Database, title: "Dataset assessment completed", asset: "TERRAIN-CLASSIFICATION-03", time: "25m ago" },
                  { id: "3", icon: FileCheck2, title: "Model verification completed", asset: "VISION-DETECTOR-V2.onnx", time: "1h ago" },
                  { id: "4", icon: Bell, title: "Assurance report generated", asset: "CAR-2026-0927-001", time: "2h ago" }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer text-xs space-y-1 ${
                        notificationsRead
                          ? "border-slate-100 dark:border-slate-800 bg-transparent opacity-80"
                          : "border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>{item.asset}</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setShowNotifications(false);
                  setActiveTab("audit");
                }}
                className="w-full mt-2 text-center text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline py-1"
              >
                View full audit trail →
              </button>
            </div>
          )}
        </div>

        {/* Profile Avatar Dropdown */}
        <div ref={profileContainerRef} className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent ${
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-100 text-slate-800"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-mono font-bold text-xs text-white shadow-xs">
              A1
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold block leading-none">Analyst-01</span>
              <span className="text-[10px] text-slate-500 font-mono leading-none">ANALYST-01</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Menu */}
          {showProfile && (
            <div className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-2xl z-50 p-2 text-xs font-sans ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-0.5">
                <div className="font-bold text-sm">Analyst-01</div>
                <div className="text-[11px] text-slate-500 font-mono">ID: {user.id}</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">{user.unit}</div>
              </div>

              <div className="py-1 space-y-0.5">
                {/* Theme Selector */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Theme Mode</span>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      onClick={() => updateSettings({ theme: "light" })}
                      className={`p-1 rounded-md transition-colors ${settings.theme === "light" ? "bg-white text-blue-600 shadow-xs" : "text-slate-400"}`}
                      title="Light Mode"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateSettings({ theme: "dark" })}
                      className={`p-1 rounded-md transition-colors ${settings.theme === "dark" ? "bg-slate-950 text-blue-400 shadow-xs" : "text-slate-400"}`}
                      title="Dark Mode"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfile(false);
                    setActiveTab("settings");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
                >
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <span>Settings & Preferences</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfile(false);
                    setActiveTab("help");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Help & Coverage</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 font-bold flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
