import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import "../style.css";
import LatestActiveAccountList from "@/Components/list/latest-active-user-list";
import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { User, GraduationCap, FileText } from "lucide-react";

const TeachingStaffDashboard = (props) => {
  const isProgramHead = props.is_program_head;

  return (
    <>
      <Head title="Dashboard" />
        <motion.div
          className="w-full py-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="w-full flex flex-col gap-6 pt-4">
            <MaintenanceScheduleReminder />
            <CurrentDateTime />
            <CurrentSemesterBanner />

            {/* === STAT CARDS SECTION === */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isProgramHead ? 'lg:grid-cols-4' : ''} gap-4`}>
              {isProgramHead && (
                <Link href="/teaching-staff/faculty-list" className="h-full grid">
                  <QuantityCard
                    h="h-[9rem]"
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
                  h="h-[9rem]"
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
                  h="h-[9rem]"
                  num={props.complaint}
                  icon={FileText}
                  textColor="text-green-700"
                  label="Total Complaints"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>

              {isProgramHead && (
                <Link href="/referral" className="h-full grid">
                  <QuantityCard
                    h="h-[9rem]"
                    num={props.referral}
                    icon={FileText}
                    label="Total Referral"
                    textColor="text-blue-700"
                    color={{
                      bg: "bg-white hover:bg-black/5 transition-all",
                    }}
                  />
                </Link>
              )}
            </div>

            {/* === ACTIVE ACCOUNT LISTS === */}
            <div className="flex flex-col lg:flex-row gap-6">
              {isProgramHead && (
                <div className="w-full lg:w-1/2">
                  <LatestActiveAccountList
                    list={props.active_faculty}
                    type="Faculty Members"
                    dataKey="active_faculty"
                  />
                </div>
              )}

              <div className={`w-full ${isProgramHead ? 'lg:w-1/2' : ''}`}>
                <LatestActiveAccountList
                  list={props.active_student}
                  type="Students"
                  dataKey="active_student"
                />
              </div>
            </div>
          </div>
        </motion.div>
    </>
  );
};

TeachingStaffDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default TeachingStaffDashboard;
