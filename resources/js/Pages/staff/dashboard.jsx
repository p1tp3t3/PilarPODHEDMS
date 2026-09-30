import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import '../style.css'
import PendingRequestList from "@/Components/list/pending-request-list";
import AvailabilityList from "@/Components/list/availability-list";
import { Link } from "@inertiajs/react";
import { FileText } from "lucide-react";

const NonTeachingStaffDashboard = (props) => {
    return (
            <div className="w-full py-10">
                <MaintenanceScheduleReminder />
                <CurrentDateTime />
                <CurrentSemesterBanner />

                <div className="w-full flex gap-5">
                    <div className="w-full flex gap-5 pt-6">
                        <div className={`h-full w-full grid ${props.is_guard ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                            <Link href="/complaint">
                                <QuantityCard
                                    h='h-[9rem]'
                                    num={props.complaint}
                                    icon={FileText}
                                    label='Total Complaints'
                                    textColor='text-blue-700'
                                    color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                />
                            </Link>
                            {props.is_guard &&
                            <Link href="/gatepass-verification">
                                <QuantityCard 
                                    h='h-[9rem]' 
                                    num={props.approved_gatepass}
                                    icon={FileText}
                                    label='Total Approved Gate Pass'
                                    textColor='text-blue-700'
                                    color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                />
                            </Link> }
                        </div>
                    </div> 
                </div>
            </div>
    )
}

NonTeachingStaffDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default NonTeachingStaffDashboard