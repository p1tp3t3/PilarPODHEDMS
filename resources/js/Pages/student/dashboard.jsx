import QuantityCard from "@/Components/card/qntty-statistic-card";
import AuthLayout from "@/Layouts/auth-layout";
import "../style.css";
import AppointmentScheduleList from "@/Components/list/upcoming-sched-list";
import TabSwitcher from "@/Components/other/tab-switcher";
import OffenseList from "@/Components/list/offense-list";
import { Link } from "@inertiajs/react";
import IncidentRiskCard from "@/Components/card/incident-risk-card";
import { useState } from "react";
import PenaltyList from "@/Components/list/penalty-list";
import { motion } from "framer-motion";
import { FileText, DoorOpen, CalendarX } from "lucide-react";

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
      <motion.div
        className="w-full py-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* === Tab Buttons === */}
        <div className="mb-6">
          <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
        </div>

        {/* === OVERVIEW TAB === */}
        {choose === "overview" && (
          <div className="w-full flex flex-col gap-6">
            {/* === Complaint / Gate Pass / Absent Form Summary === */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Link href="/complaint">
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
              <Link href="/gatepass">
                <QuantityCard
                  h="h-[9rem]"
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
                  h="h-[9rem]"
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
            <div className="flex flex-col lg:flex-row gap-5 justify-between">
              <div className="w-full lg:w-1/2">
                <IncidentRiskCard user_id={props.user.id} />
              </div>

              <div className="w-full lg:w-1/2">
                <div className="h-full">
                  <AppointmentScheduleList
                    list={props.upcoming_appointment[0].appointment}
                    showAction={false}
                  />
                </div>
              </div>
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
  );
};

StudentDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default StudentDashboard;
