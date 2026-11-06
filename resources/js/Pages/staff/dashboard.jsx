import AuthLayout from "@/Layouts/auth-layout";
import DashboardInfoBar from "@/Components/other/dashboard-info-bar"
import QuantityCard from "@/Components/card/qntty-statistic-card";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import '../style.css'
import PendingRequestList from "@/Components/list/pending-request-list";
import AvailabilityList from "@/Components/list/availability-list";
import DashboardTabs from "@/Components/other/dashboard-tabs";
import { Head, Link } from "@inertiajs/react";
import { FileText , Share2 } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

const NonTeachingStaffDashboard = (props) => {
    return (
        <>
            <Head title="Dashboard" />
            <PageTitle title="Dashboard" />
            <div className="w-full pt-5 pb-6 sm:pb-10">
                <MaintenanceScheduleReminder />
                <DashboardTabs>
                {/* Date/time, current semester and prefect availability in one card. */}
                <DashboardInfoBar />

                <div className="w-full flex gap-5">
                    <div className="w-full flex gap-5 pt-6">
                        <div className={`h-full w-full grid ${props.is_guard || props.is_guidance ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                            <Link href="/complaint">
                                <QuantityCard
                                    h='h-[6rem]'
                                    num={props.complaint}
                                    icon={FileText}
                                    label='Total Complaints'
                                    color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                />
                            </Link>
                            {props.is_guard &&
                            <Link href="/gatepass-verification">
                                <QuantityCard 
                                    h='h-[6rem]' 
                                    num={props.approved_gatepass}
                                    icon={FileText}
                                    label='Total Approved Gate Pass'
                                    color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                />
                            </Link> }
                            {props.is_guidance &&
                            <Link href="/guidance/referral">
                                <QuantityCard
                                    h='h-[6rem]'
                                    num={props.referral}
                                    icon={Share2}
                                    label='Total Referrals'
                                    color={{bg: 'bg-white hover:bg-black/5 transition-all'}}
                                />
                            </Link>}
                        </div>
                    </div>
                </div>
                </DashboardTabs>
            </div>
        </>
    )
}

NonTeachingStaffDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default NonTeachingStaffDashboard