import useListData from "@/others/hooks/use-list-data";
import AuthLayout from "@/Layouts/auth-layout";
import { useEffect, useState } from "react";
import ManageViolation from "./violation/manage-violation";
import SetViolationModal from "@/Components/modal/submission-form/set-violation-modal";
import ManagePenalty from "./violation/manage-penalty";
import SetPenaltyModal from "@/Components/modal/submission-form/set-penalty-modal";
import StudentViolationList from "@/Components/list/student-violation-list";
import { useReload } from "@/context-provider/reload-provider";
import PageLayout from "@/Layouts/page-layout";
import { Head } from "@inertiajs/react";

// The prefect's Violation Management pages (prefect only, see routes/auth.php).
const ViolationManagement = (props) => {
    // Which page of the group this is (its own URL): violations, penalties,
    // student-violations.
    const section = props.section ?? 'violations';
    const TITLES = {
        violations: 'Violations',
        penalties: 'Penalties',
        'student-violations': 'Student Violations',
    };
    const [penalty, openPenalty] = useState(false),
          [violation, openViolation] = useState(false),
          [action, setAction] = useState("create"),
          [data, setData] = useState(null),
          [violation_list, setViolationList] = useState(null),
          [penalty_list, setPenaltyList] = useState(null),
          [clickedOk, setClickOk] = useState(false);

    const { loadRegister, setReload, setOnClose } = useReload();

    // The tables load from /api/violation-management/{section} once the page
    // opens (and again after a reload).
    const { data: lists } = useListData();
    useEffect(() => {
        if (!lists) return;
        setViolationList(lists.violation ?? []);
        setPenaltyList(lists.penalty ?? []);
    }, [lists]);

    useEffect(() => {
        setOnClose((e) => {
            if(action != 'add') {
                setReload(e)
                if(clickedOk) window.location.href = '/'
                setClickOk(false)
            }else setReload(e)
        });
    }, [action, clickedOk]);

    const openActionModal = (type, act, editData = null) => {
        setAction(act);
        setData(act != 'add' ? editData : null);
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
            penalty={lists?.penalty ?? []}
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
            list={penalty_list}
        />
        <PageLayout title={TITLES[section].toUpperCase()}>
            <div className="min-w-0">
                {section === "violations" && (
                    <ManageViolation
                        list={violation_list}
                        original_list={lists?.violation}
                        setter={setViolationList}
                        reload={loadRegister}
                        events={[openActionModal]}
                        canAdd
                        canEditRow
                        canDelete
                        canView
                    />
                )}

                {section === "penalties" && (
                    <ManagePenalty
                        list={penalty_list}
                        original_list={lists?.penalty}
                        setter={setPenaltyList}
                        reload={loadRegister}
                        events={[openActionModal]}
                        canAdd
                        canDelete
                    />
                )}

                {section === "student-violations" && (
                    <div className="grid gap-4">
                        <StudentViolationList list={lists?.student_violation_list ?? null} />
                    </div>
                )}
            </div>
        </PageLayout>
        </>
    );
};

ViolationManagement.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ViolationManagement;
