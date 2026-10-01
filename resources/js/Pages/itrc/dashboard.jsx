import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import SystemInfoPanel from "@/Components/other/system-info-panel";
import "../style.css";
import BarGraph from "@/Components/card/bar-graph-statistic-card";
import NewUserList from "@/Components/list/new-user-list";
import "../../Responsive/dashboard-responsive.css";
import PendingRequestList from "@/Components/list/pending-request-list";
import { toTitleCase } from "@/others/function";
import { Head, Link } from "@inertiajs/react";
import LatestActiveAccountList from "@/Components/list/latest-active-user-list";
import TabSwitcher from "@/Components/other/tab-switcher";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, FileText, ShieldAlert, AlertTriangle } from "lucide-react";

const ITRCDashboard = (props) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [maintenanceMode, setMaintenanceMode] = useState(!!props.maintenance_mode);

  useEffect(() => {
    new Broadcast(
      'public',
      'maintenance',
      'MaintenanceModeToggled',
      (e) => setMaintenanceMode(!!e.enabled)
    ).configure('maintenance mode status (dashboard)');
  }, []);

  const bar = props.bargraph;
  const userColor = [
    "#ff6384",
    "#ffce56",
    "#ff3e56",
    "#4bc0c0",
    "#9966ff",
    "#ff9f40",
    "#ff2384",
  ];
  const user = props.role;

  const barDataset = () => {
    const l = [];
    for (let a = 0; a < user.length; a++) {
      const c = Array(6).fill(userColor[a]);
      const r = [];
      bar.forEach((e) => r.push(e.count[a]));
      l.push({
        data: r,
        label: toTitleCase(user[a]),
        backgroundColor: c,
        hoverBackgroundColor: c,
      });
    }
    return l;
  };

  const month = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEPT",
    "OCT",
    "NOV",
    "DEC",
  ];

  const handleBarClick = (e) => {
    console.log(e);
  };

  return (
    <>
      <Head title="Dashboard" />
      <motion.div
        className="w-full pt-2 sm:pt-3 pb-6 sm:pb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="w-full flex flex-col gap-4">
          {maintenanceMode && (
            <Link
              href="/maintenance"
              className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3 hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-[0.85em] font-semibold text-red-900">
                Maintenance mode is currently ON — the system is locked down for everyone except super admins.
              </p>
            </Link>
          )}

          <MaintenanceScheduleReminder />

          <TabSwitcher
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "system_info", label: "System Info" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "overview" && (
          <div className="w-full flex flex-col gap-6 lg:gap-8">
          <div className="-mb-4 lg:-mb-6">
            <CurrentDateTime />
            <CurrentSemesterBanner />
          </div>

          {/* === TOP SECTION === */}
          <div className="w-full grid gap-5">
            {/* Quantity Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 sm:grid-cols-2 gap-4">
              <Link href="/super-admin/user-accounts">
                <QuantityCard
                  h="h-[9rem]"
                  num={props.account_total}
                  icon={Users}
                  label="Total Registered Users"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/super-admin/program">
                <QuantityCard
                  h="h-[9rem]"
                  num={props.program}
                  icon={GraduationCap}
                  label="Total College Programs"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/super-admin/report">
                <QuantityCard
                  h="h-[9rem]"
                  num={props.report}
                  icon={FileText}
                  label="Total Action Logs"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/violation-management">
                <QuantityCard
                  h="h-[9rem]"
                  num={props.total_violation}
                  icon={ShieldAlert}
                  label="Total Violations"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
            </div>

            {/* Bar Graph (Optional / Commented) */}
            {/**
            <div className="w-full flex flex-col lg:flex-row gap-5">
              <div className="w-full">
                <BarGraph
                  dataset={barDataset()}
                  withBorder={true}
                  label={month}
                  onBarClick={handleBarClick}
                  title="Total Number of Users this Year"
                />
              </div>
              <div className="w-full lg:w-[20rem] flex-shrink-0">
                <PendingRequestList type="itrc" />
              </div>
            </div>
             */}
          </div>

          {/* === BOTTOM SECTION === */}
          <div className="w-full flex flex-col lg:flex-row gap-5">
            {/* New Users */}
            <div className="w-full">
              <NewUserList list={props.new_users} />
            </div>

            {/* Latest Active Accounts */}
            <div className="w-full">
              <LatestActiveAccountList list={props.active} />
            </div>
          </div>
          </div>
          )}

          {activeTab === "system_info" && (
            <SystemInfoPanel />
          )}
        </div>
      </motion.div>
    </>
  );
};

ITRCDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCDashboard;
