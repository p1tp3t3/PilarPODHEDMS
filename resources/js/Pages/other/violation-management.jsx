import AuthLayout from "@/Layouts/auth-layout";
import { useEffect, useState } from "react";
import ManageViolation from "../itrc/maintenance/manage-violation";
import SetViolationModal from "@/Components/modal/submission-form/set-violation-modal";
import ManagePenalty from "../itrc/maintenance/manage-penalty";
import SetPenaltyModal from "@/Components/modal/submission-form/set-penalty-modal";
import StudentViolationList from "@/Components/list/student-violation-list";
import ViolationAccessRequests from "../itrc/maintenance/violation-access-requests";
import { useReload } from "@/context-provider/reload-provider";
import { ViolationAccessService } from "@/others/services/violation-access-service";
import PageLayout from "@/Layouts/page-layout";
import { Head } from "@inertiajs/react";

const ViolationManagement = (props) => {
    const isSuperAdmin = props.auth?.user?.role === 'super_admin';
    const [access, setAccess] = useState(
        isSuperAdmin
            ? { violation: { add: false, edit: false, delete: false }, penalty: { add: false, delete: false } }
            : { violation: { add: true, edit: true, delete: true }, penalty: { add: true, delete: true } }
    );
    // Which page of the Violation Management group this is (its own URL —
    // see routes/auth.php): violations, penalties, student-violations, access.
    const section = props.section ?? 'violations';
    const TITLES = {
        violations: 'Violations',
        penalties: 'Penalties',
        'student-violations': 'Student Violations',
        access: isSuperAdmin ? 'Edit Access' : 'Access Requests',
    };
    const [penalty, openPenalty] = useState(false),
          [violation, openViolation] = useState(false),
          [action, setAction] = useState("create"),
          [data, setData] = useState(null),
          [violation_list, setViolationList] = useState(props.violation ?? []),
          [penalty_list, setPenaltyList] = useState(props.penalty ?? []),
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
        <Head title={TITLES[section]} />
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
            penalty={props.penalty ?? []}
            keywordOptions={(violation_list ?? []).flatMap((v) => Array.isArray(v.keywords) ? v.keywords : [])}
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
        <PageLayout title={TITLES[section].toUpperCase()}>
            <div className="min-w-0">
                {section === "violations" && (
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

                {section === "penalties" && (
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

                {section === "student-violations" && !isSuperAdmin && (
                    <div className="grid gap-4">
                        <StudentViolationList list={props.student_violation_list} />
                    </div>
                )}

                {section === "access" && (
                    <ViolationAccessRequests user={props.auth?.user} />
                )}
            </div>
        </PageLayout>
        </>
    );
};

ViolationManagement.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ViolationManagement;
