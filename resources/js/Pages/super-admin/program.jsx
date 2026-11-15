import { useEffect, useState } from "react";
import useListData from "@/others/hooks/use-list-data";
import ManageProgram from "./maintenance/manage-program";
import SetProgramModal from "@/Components/modal/submission-form/set-program-modal";
import { useReload } from "@/context-provider/reload-provider";
import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import Btn from "@/Components/button/normal-btn";
import { Head } from "@inertiajs/react";
import { Plus } from "lucide-react";

const ITRCProgram = (props) => {
    // The table loads from /api/super-admin/program once the page opens.
    const { data: lists } = useListData();
    const [program, openProgram] = useState(false),
          [action, setAction] = useState("create"),
          [data, setData] = useState(null),
          [program_list, setProgramList] = useState(null),
          [clickedOk, setClickOk] = useState(false);

    const { loadRegister, setReload, setOnClose } = useReload();

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
        if(type === 'program') {
            openProgram(true);
        } else if(type === 'violation') {
            openViolation(true);
        }
    }


    useEffect(() => { if (lists) setProgramList(lists.program) }, [lists]);

    return (
        <>
        <Head title="College Programs" />
        <SetProgramModal
            close={program} 
            closeModal={openProgram} 
            pd={['px-5', 'py-7']}
            isEnableOuterClose={true}
            reload={loadRegister}
            action={action}
            data={data}
            setClickOk={setClickOk}
            setter={setProgramList}
        />
        <PageLayout
            title="College Programs"
            actionsWithFilters
            rightSideComponent={
                <Btn onclick={() => openActionModal('program', 'add')} icon={<Plus size={20} />}>
                    Add Program
                </Btn>
            }
        >
            <ManageProgram list={program_list} original_list={lists?.program} events={[openActionModal]} setter={setProgramList} reload={loadRegister} />
        </PageLayout>
        </>
    );
};

ITRCProgram.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default ITRCProgram;
