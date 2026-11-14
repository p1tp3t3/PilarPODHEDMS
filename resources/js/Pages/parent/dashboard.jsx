import AuthLayout from "@/Layouts/auth-layout";
import DashboardInfoBar from "@/Components/other/dashboard-info-bar"
import MyRequestsPanel from "@/Components/card/my-requests-panel";
import QuantityCard from "@/Components/card/qntty-statistic-card";
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
                <DashboardTabs>
                {/* Date/time, current semester and prefect availability in one card. */}
                <DashboardInfoBar />

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
                    <Link href="/children/monitor">
                        <QuantityCard
                            h="h-[6rem]"
                            num={props.children}
                            icon={Users}
                            label="Total Children"
                            color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                        />
                    </Link>
                    <Link href="/complaint">
                        <QuantityCard
                            h="h-[6rem]"
                            num={props.complaint}
                            icon={FileText}
                            label="Total Complaints"
                            color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                        />
                    </Link>
                </div>
                {/* Their earliest open requests and where each one is now. */}
                <div className="pt-5">
                    <MyRequestsPanel data={props.my_requests} />
                </div>
                </DashboardTabs>
            </div>
        </>
    )
}

ParentDashboard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ParentDashboard
