import QuantityCard from "@/Components/card/qntty-statistic-card";
import AuthLayout from "@/Layouts/auth-layout";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import "../style.css";
import AppointmentScheduleList from "@/Components/list/upcoming-sched-list";
import TabSwitcher from "@/Components/other/tab-switcher";
import OffenseList from "@/Components/list/offense-list";
import { Head, Link } from "@inertiajs/react";
import { useState } from "react";
import PenaltyList from "@/Components/list/penalty-list";
import { motion } from "framer-motion";
import { FileText, DoorOpen, CalendarX } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

const StudentDashboard = (props) => {
  const [choose, setChoose] = useState("overview");

  const handleSelect = (type) => {
    if (choose !== type) setChoose(type);
  };

  const optionTab = [
    { key: "overview", label: "Overview" },
    { key: "offense", label: "List of Violations" },
    { key: "penalty", label: "List of Penalties" },
  ];

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

        {/* === Tab Buttons === */}
        <div className="mb-4">
          <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
        </div>

        {/* === OVERVIEW TAB === */}
        {choose === "overview" && (
          <div className="w-full flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 [&>*]:!mb-0 [&>*]:h-full">
              <CurrentDateTime />
              <CurrentSemesterBanner />
            </div>

            {/* === Complaint / Gate Pass / Absent Form Summary === */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Link href="/complaint">
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
              <Link href="/gatepass">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.gatepass}
                  icon={DoorOpen}
                  textColor="text-blue-700"
                  label="Total Gate Passes"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
              <Link href="/absent-form">
                <QuantityCard
                  h="h-[6rem]"
                  num={props.absent_form}
                  icon={CalendarX}
                  textColor="text-amber-700"
                  label="Total Absent Forms"
                  color={{
                    bg: "bg-white hover:bg-black/5 transition-all",
                  }}
                />
              </Link>
            </div>

            {/* === Incident Risk & Appointments === */}
            <div className="w-full">
              <AppointmentScheduleList
                list={props.upcoming_appointment[0].appointment}
                previous={props.previous_appointment ?? []}
                showAction={false}
              />
            </div>
          </div>
        )}

        {/* === OFFENSE TAB === */}
        {choose === "offense" && (
          <div className="pt-6">
            <OffenseList />
          </div>
        )}
        {choose === "penalty" && (
          <div className="pt-6">
            <PenaltyList />
          </div>
        )}
      </motion.div>
    </>
  );
};

StudentDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default StudentDashboard;
