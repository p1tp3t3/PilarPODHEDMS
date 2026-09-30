import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import AvailabilityList from "@/Components/list/availability-list";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import '../style.css'
import PendingRequestList from "@/Components/list/pending-request-list";
import AppointmentScheduleList from "@/Components/list/upcoming-sched-list";
import { Link } from "@inertiajs/react";
import { Users, FileText } from "lucide-react";

const ParentDashboard = (props) => {
    const actDataset = [
        {       
            label: "Total", 
            data: [10, 20, 30, 21, 10, 20, 30, 21, 10, 12, 32, 18],
            borderColor: "rgba(43, 255, 0, 0.445)", 
            backgroundColor: "rgba(43, 255, 0, 0.445)", 
            borderWidth: 2, 
            pointRadius: 5, 
            fill: true,
        }
    ]
    return (
            <div className="w-full py-10">
                <MaintenanceScheduleReminder />
                <CurrentSemesterBanner />

                <div className="w-full flex gap-5">
                    <div className="w-full flex flex-col gap-5 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="w-full grid">
                                <Link href="/children/monitor">
                                    <QuantityCard 
                                        h='h-[9rem]' 
                                        num={props.children}
                                        icon={Users}
                                        textColor='text-green-700'
                                        label='Total Children'
                                        color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                    />
                                </Link>
                            </div>
                            <div className="w-full grid">
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
                            </div>
                        </div>
                        <div className="flex justify-between gap-3">
                            <div className="w-full">
                                <div className="bg-white h-full">
                                    <AppointmentScheduleList
                                    list={props.upcoming_appointment[0].appointment}
                                    showAction={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div> 
                </div>
            </div>
    )
}

ParentDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ParentDashboard