import AuthLayout from "@/Layouts/auth-layout";
import DashboardInfoBar from "@/Components/other/dashboard-info-bar"
import MyRequestsPanel from "@/Components/card/my-requests-panel";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import "../style.css";
import LatestActiveAccountList from "@/Components/list/latest-active-user-list";
import NewUserList from "@/Components/list/new-user-list";
import DashboardTabs from "@/Components/other/dashboard-tabs";
import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { User, GraduationCap, FileText } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

const ProgramDashboard = (props) => {
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
          <DashboardTabs>
          <div className="w-full flex flex-col gap-6">
            {/* Date/time, current semester and prefect availability in one card. */}
            <DashboardInfoBar />

            {/* === STAT CARDS SECTION === */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isProgramHead ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
              {isProgramHead && (
                <Link href="/program/faculty-list" className="h-full grid">
                  <QuantityCard
                    h="h-[6rem]"
                    num={props.faculty}
                    icon={User}
                    label="Total Faculty Members"
                    color={{
                      bg: "bg-white hover:bg-black/5 transition-all",
                    }}
                  />
                </Link>
              )}

              <Link href="/program/student-list" className="h-full grid">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.student_list}
                  icon={GraduationCap}
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
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
            </div>

            {/* 1st column: My requests (a list) over New Users; 2nd column:
                Active Users (their program). Stacked on phones. */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2 min-w-0 flex flex-col gap-6">
                <MyRequestsPanel data={props.my_requests} stacked />
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

ProgramDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ProgramDashboard;
