import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import { PrefectAvailabilityCard } from "@/Components/other/prefect-availability";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import "../style.css";
import LatestActiveAccountList from "@/Components/list/latest-active-user-list";
import NewUserList from "@/Components/list/new-user-list";
import DashboardTabs from "@/Components/other/dashboard-tabs";
import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { User, GraduationCap, FileText } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

const TeachingStaffDashboard = (props) => {
  const isProgramHead = props.is_program_head;

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
          <MaintenanceScheduleReminder />
          <DashboardTabs>
          <div className="w-full flex flex-col gap-6">
            {/* Same as the super admin: date/time and school year side by side. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 [&>*]:!mb-0 [&>*]:h-full">
                <CurrentDateTime />
                <CurrentSemesterBanner />
            </div>
            <PrefectAvailabilityCard />

            {/* === STAT CARDS SECTION === */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isProgramHead ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
              {isProgramHead && (
                <Link href="/teaching-staff/faculty-list" className="h-full grid">
                  <QuantityCard
                    h="h-[6rem]"
                    num={props.faculty}
                    icon={User}
                    textColor="text-green-700"
                    label="Total Faculty Members"
                    color={{
                      bg: "bg-white hover:bg-black/5 transition-all",
                    }}
                  />
                </Link>
              )}

              <Link href="/teaching-staff/student-list" className="h-full grid">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.student_list}
                  icon={GraduationCap}
                  textColor="text-green-700"
                  label="Total Enrolled Students"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>

              <Link href="/complaint" className="h-full grid">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.complaint}
                  icon={FileText}
                  textColor="text-green-700"
                  label="Total Complaints"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>

              {/* Faculty refer students too, so everyone sees their referral count. */}
              <Link href="/referral" className="h-full grid">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.referral}
                  icon={FileText}
                  label="Total Referral"
                  textColor="text-blue-700"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
            </div>

            {/* === NEW USERS + ACTIVE USERS (their program) === */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2 min-w-0">
                <NewUserList
                  list={props.new_users}
                  weekStart={props.new_users_week_start}
                  weekEnd={props.new_users_week_end}
                />
              </div>
              <div className="w-full lg:w-1/2 min-w-0">
                <LatestActiveAccountList list={props.active} dataKey="active" />
              </div>
            </div>
          </div>
          </DashboardTabs>
        </motion.div>
    </>
  );
};

TeachingStaffDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default TeachingStaffDashboard;
