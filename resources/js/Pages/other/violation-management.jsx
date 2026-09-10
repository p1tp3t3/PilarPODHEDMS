import AuthLayout from "@/Layouts/auth-layout";
import { useEffect, useState } from "react";
import ManageViolation from "../itrc/maintenance/manage-violation";
import SetViolationModal from "@/Components/modal/submission-form/set-violation-modal";
import ManagePenalty from "../itrc/maintenance/manage-penalty";
import SetPenaltyModal from "@/Components/modal/submission-form/set-penalty-modal";
import TabSwitcher from "@/Components/other/tab-switcher";
import StudentViolationList from "@/Components/list/student-violation-list";
import ViolationAccessRequests from "../itrc/maintenance/violation-access-requests";
import { useReload } from "@/context-provider/reload-provider";
import { ViolationAccessService } from "@/others/services/violation-access-service";

const ViolationManagement = (props) => {
    const isSuperAdmin = props.user?.role === 'super_admin';
    const [access, setAccess] = useState(
        isSuperAdmin
            ? { violation: { add: false, edit: false, delete: false }, penalty: { add: false, delete: false } }
            : { violation: { add: true, edit: true, delete: true }, penalty: { add: true, delete: true } }
    );
    const [activeTab, setActiveTab] = useState(new URLSearchParams(window.location.search).get('tab') ?? 'violations'),
          [penalty, openPenalty] = useState(false),
          [violation, openViolation] = useState(false),
          [action, setAction] = useState("create"),
          [data, setData] = useState(null),
          [violation_list, setViolationList] = useState(props.violation),
          [penalty_list, setPenaltyList] = useState(props.penalty),
          [clickedOk, setClickOk] = useState(false);

    const { loadRegister, setReload, setOnClose } = useReload();

    useEffect(() => {
        if (isSuperAdmin) {
            ViolationAccessService.getStatus((data) => setAccess(data.has_access));
        }
    }, []);

    useEffect(() => {
        setOnClose(() => (e) => {
            if(action != 'add') {
                setReload(e)
                if(clickedOk) window.location.href = '/'
                setClickOk(false)
            }else setReload(e)
        });
    }, [action, clickedOk]);

    const openActionModal = (type, act, editData = null) => {
        setAction(act);
        if(act != 'add') setData(editData);
        if(type === 'penalty') {
            openPenalty(true);
        } else if(type === 'violation') {
            openViolation(true);
        }
    }


    return (
        <>
        <SetViolationModal
            close={violation}
            closeModal={openViolation}
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            reload={loadRegister}
            action={action}
            data={data}
            setClickOk={setClickOk}
            setter={setViolationList}
            penalty={props.penalty}
        />
        <SetPenaltyModal
            close={penalty}
            closeModal={openPenalty}
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            reload={loadRegister}
            action={action}
            data={data}
            setClickOk={setClickOk}
            setter={setPenaltyList}
        />
        <div className="grid gap-8">
            <div className="flex-shrink-0 h-full">
                <div className="pt-6 sm:pt-10">
                    <div className="grid w-full gap-3">

                        {/* Page Title */}
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                            Violation Management
                        </h1>

                        {/* Tabs */}
                        <TabSwitcher
                            tabs={[
                                { key: "violations", label: "Manage Violations" },
                                { key: "penalty", label: "Manage Penalties" },
                                ...(isSuperAdmin ? [] : [{ key: "student-violations", label: "Student Violations" }]),
                                { key: "access-requests", label: isSuperAdmin ? "Edit Access" : "Access Requests" },
                            ]}
                            value={activeTab}
                            onChange={setActiveTab}
                        />

                        {/* Content */}
                        <div className="py-6 sm:py-10">
                            {activeTab === "violations" && (
                                <ManageViolation
                                    list={violation_list}
                                    original_list={props.violation}
                                    setter={setViolationList}
                                    reload={loadRegister}
                                    events={[openActionModal]}
                                    canAdd={access.violation.add}
                                    canEditRow={access.violation.edit}
                                    canDelete={access.violation.delete}
                                />
                            )}

                            {activeTab === "penalty" && (
                                <ManagePenalty
                                    list={penalty_list}
                                    original_list={props.penalty}
                                    setter={setPenaltyList}
                                    reload={loadRegister}
                                    events={[openActionModal]}
                                    canAdd={access.penalty.add}
                                    canDelete={access.penalty.delete}
                                />
                            )}

                            {activeTab === "student-violations" && !isSuperAdmin && (
                                <div className="grid gap-4">
                                    <StudentViolationList list={props.student_violation_list} />
                                </div>
                            )}

                            {activeTab === "access-requests" && (
                                <ViolationAccessRequests user={props.user} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        </>
    );
};

ViolationManagement.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ViolationManagement;
