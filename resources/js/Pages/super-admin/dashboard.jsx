import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import { PrefectAvailabilityCard } from "@/Components/other/prefect-availability";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import SystemInfoPanel from "@/Components/other/system-info-panel";
import "../style.css";
import LineGraph from "@/Components/card/line-graph-statistic";
import DropdownField from "@/Components/input/dropdown";
import { DashboardService } from "@/others/services/dashboard-service";
import NewUserList from "@/Components/list/new-user-list";
import "../../Responsive/dashboard-responsive.css";
import { Head, Link } from "@inertiajs/react";
import LatestActiveAccountList from "@/Components/list/latest-active-user-list";
import TabSwitcher from "@/Components/other/tab-switcher";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, FileText, ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

// One fixed color per role so a role keeps its color across filters.
const ROLE_COLORS = {
  super_admin: "#6366f1",
  sub_admin: "#0ea5e9",
  student: "#16a34a",
  teaching_staff: "#f59e0b",
  non_teaching_staff: "#db2777",
  parent: "#8b5cf6",
};
const FALLBACK_COLORS = ["#14b8a6", "#ef4444", "#84cc16", "#64748b"];

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

  // Users line graph: one line per role, over a school year (optionally
  // one semester), a calendar year, or one month — same ranges as the
  // prefect's bar graph.
  const date = new Date();
  const currentYear = `${date.getFullYear()}`;
  const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const [range, setRange] = useState("school_year");
  const [schoolYearId, setSchoolYearId] = useState(
    props.current_school_year_id ?? props.graph_school_years?.[0]?.id ?? ""
  );
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [userGraph, setUserGraph] = useState(props.user_graph ?? { roles: [], buckets: [] });
  const period = range === "school_year" ? schoolYearId : range === "yearly" ? year : month;
  const firstLoad = useRef(true);

  useEffect(() => {
    // The page already arrives with the default (current school year) data.
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (!period) return;
    DashboardService.getUserGraph([range, period, range === "school_year" ? semester : ""], setUserGraph);
  }, [range, period, semester]);

  const userGraphDataset = (userGraph.roles ?? []).map((role, i) => {
    const color = ROLE_COLORS[role.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    return {
      label: role.label,
      data: (userGraph.buckets ?? []).map((b) => b.count?.[i] ?? 0),
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.2,
    };
  });

  const yearOptions = () => {
    const list = [];
    for (let y = date.getFullYear(); y >= 2024; y--) list.push({ val: `${y}`, label: `${y}` });
    return list;
  };

  return (
    <>
      <Head title="Dashboard" />
      <PageTitle title="Dashboard" />
      <motion.div
        className="w-full pt-5 pb-6 sm:pb-10"
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
          <div className="w-full flex flex-col gap-5">
          {/* Date/time and current school year side by side; both banners
              carry their own bottom margin elsewhere, cancelled here. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 [&>*]:!mb-0 [&>*]:h-full">
            <CurrentDateTime />
            <CurrentSemesterBanner />
          </div>
          <PrefectAvailabilityCard />

          {/* === TOP SECTION === */}
          <div className="w-full grid gap-5">
            {/* Quantity Cards */}
            {/* Phones: 2 per row (last one full width). Mid screens: 3 then 2,
                both rows full width. Very wide: all 5 in one row. */}
            <div className="grid grid-cols-2 lg:grid-cols-6 2xl:grid-cols-5 gap-3 sm:gap-4 [&>*]:lg:col-span-2 [&>*:nth-child(n+4)]:lg:col-span-3 [&>*]:2xl:!col-span-1 [&>*:last-child]:max-lg:col-span-2">
              <Link href="/super-admin/user-accounts">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.account_total}
                  icon={Users}
                  label="Registered Users"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/super-admin/program">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.program}
                  icon={GraduationCap}
                  label="Programs"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/super-admin/report/statistics">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.report}
                  icon={FileText}
                  label="Action Logs"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/violation-management/violations">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.total_violation}
                  icon={ShieldAlert}
                  label="Violations"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/super-admin/roles">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.total_roles}
                  icon={ShieldCheck}
                  label={`Roles (${props.active_roles ?? 0} active)`}
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
            </div>

            {/* Number of users per role */}
            <div className="w-full h-[30rem] sm:h-[24rem]">
              <LineGraph
                dataset={userGraphDataset}
                label={(userGraph.buckets ?? []).map((b) => b.label)}
                withBorder={true}
                bg="bg-white"
                title="Number of Users"
                showLegend={true}
                allLabel="All Roles"
                xTitle={range === "monthly" ? "Day" : "Month"}
                yTitle="New users"
                side={
                  <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-[9.5rem]">
                      <DropdownField
                        list={[
                          { val: "school_year", label: "School Year" },
                          { val: "yearly", label: "Yearly" },
                          { val: "monthly", label: "Monthly" },
                        ]}
                        keepCase={true}
                        val={range}
                        onChange={(e) => setRange(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-[9.5rem]">
                      {range === "school_year" && (
                        <DropdownField
                          list={(props.graph_school_years ?? []).map((y) => ({ val: y.id, label: `SY ${y.year}` }))}
                          keepCase={true}
                          val={schoolYearId}
                          onChange={(e) => setSchoolYearId(e.target.value)}
                        />
                      )}
                      {range === "yearly" && (
                        <DropdownField list={yearOptions()} keepCase={true} val={year} onChange={(e) => setYear(e.target.value)} />
                      )}
                      {range === "monthly" && (
                        <input
                          type="month"
                          value={month}
                          onChange={(e) => e.target.value && setMonth(e.target.value)}
                          className="w-full h-[2.5rem] rounded-lg border border-gray-300 bg-white px-3 text-[0.85em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    {range === "school_year" && (
                      <div className="w-full sm:w-[9.5rem] col-span-2">
                        <DropdownField
                          default={{ val: "", label: "All Semesters" }}
                          list={[
                            { val: "1", label: "1st Semester" },
                            { val: "2", label: "2nd Semester" },
                          ]}
                          keepCase={true}
                          val={semester}
                          onChange={(e) => setSemester(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          </div>

          {/* === BOTTOM SECTION === */}
          <div className="w-full flex flex-col lg:flex-row gap-5">
            {/* New Users */}
            <div className="w-full">
              <NewUserList list={props.new_users} weekStart={props.new_users_week_start} weekEnd={props.new_users_week_end} />
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
