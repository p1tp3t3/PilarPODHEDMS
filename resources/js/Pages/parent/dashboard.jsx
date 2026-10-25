import AuthLayout from "@/Layouts/auth-layout";
import QuantityCard from "@/Components/card/qntty-statistic-card";
import CurrentSemesterBanner from "@/Components/other/current-semester-banner";
import { PrefectAvailabilityCard } from "@/Components/other/prefect-availability";
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder";
import CurrentDateTime from "@/Components/other/current-datetime";
import '../style.css'
import DashboardTabs from "@/Components/other/dashboard-tabs";
import { Head, Link } from "@inertiajs/react";
import { Users, FileText } from "lucide-react";
import { PageTitle } from "@/context-provider/page-title-provider";

const ParentDashboard = (props) => {
    return (
        <>
            <Head title="Dashboard" />
            <PageTitle title="Dashboard" />
            <div className="w-full pt-5 pb-6 sm:pb-10">
                <MaintenanceScheduleReminder />
                <DashboardTabs>
                {/* Same as the super admin: date/time and school year side by side. */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 [&>*]:!mb-0 [&>*]:h-full">
                    <CurrentDateTime />
                    <CurrentSemesterBanner />
                </div>
                <div className="mt-3"><PrefectAvailabilityCard /></div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
                    <Link href="/children/monitor">
                        <QuantityCard
                            h="h-[6rem]"
                            num={props.children}
                            icon={Users}
                            textColor="text-green-700"
                            label="Total Children"
                            color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                        />
                    </Link>
                    <Link href="/complaint">
                        <QuantityCard
                            h="h-[6rem]"
                            num={props.complaint}
                            icon={FileText}
                            textColor="text-green-700"
                            label="Total Complaints"
                            color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                        />
                    </Link>
                </div>
                </DashboardTabs>
            </div>
        </>
    )
}

ParentDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ParentDashboard
