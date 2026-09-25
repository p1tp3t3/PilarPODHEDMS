import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import RichTextEditor from "@/Components/input/rich-text-editor"
import FormButton from "../../button/button"
import { useState, useEffect } from "react"
import { change, getProfilePic, showUserType, showOutputModal, showWarningModal, toTitleCase } from "../../../others/function"
import SearchUserBar from "@/Components/input/search-user-bar"
import ProfilePic from "../../other/profile-pic"
import { AppointmentService } from "@/others/services/appointment-service"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { X } from "lucide-react"


const AppointmentModal = (props) => {
    const MySwal = withReactContent(Swal)
    const isResched = (props.label.includes('Re-Schedule'))
    const isCancel = (props.label.includes('Cancel'))
    

    const [appoint, setAppointment] = useState({
        user_id: props.id,
        type: (isResched) ? 'reschedule' : 'schedule',
        date_appoint: props.date,
        time_start: '',
        reason: ''
    })

    const [searchedStudentParent, setSearchedStudentParent] = useState(null)

    const today = new Date()
    const todayStr = today.getFullYear() + "-" +
                      String(today.getMonth() + 1).padStart(2, "0") + "-" +
                      String(today.getDate()).padStart(2, "0")


    
    useEffect(() => {
        if(props.close) {
            props.setReschedUser(null)
            setSearchedStudentParent(null)
        }
    }, [props.close])

    useEffect(() => {
        setSearchedStudentParent(props.reschedUser)
        setAppointment((prev) => ({
            ...prev,
            type: (isResched) ? 'reschedule' : 'schedule',
            user_id: (isResched && searchedStudentParent != null) ? searchedStudentParent[0].id : props.id
        }))
    }, [props.close])

    
    useEffect(() => {
        const date = new Date(props.date);
        const formattedDate = date.getFullYear() + "-" + 
                              String(date.getMonth() + 1).padStart(2, "0") + "-" + 
                              String(date.getDate()).padStart(2, "0");
        setAppointment((prev) => ({
            ...prev,
            date_appoint: formattedDate
        }))
    }, [props.date])


    const [search, setSearch] = useState(""),
          [isSearchFocus, focusSearch] = useState(false)
    
    const handleChange = (e) => {
        change(e, setAppointment)
    }
    const handleSubmit = (e) => {
        e.preventDefault()
        if (appoint.date_appoint < todayStr) {
            showOutputModal("You Can't Schedule an Appointment for a Past Date.", 'e', () => {})
            return
        }
        if (appoint.time_start && (appoint.time_start < "07:00" || appoint.time_start > "16:30")) {
            showOutputModal("Appointments Can Only Be Scheduled Between 7:00 AM and 4:30 PM.", 'e', () => {})
            return
        }
        let label = (isResched) ? 'Are You Sure You Want To Re-Schedule ' + searchedStudentParent[0].profile?.first_name + "'s Appointment?"
                                : 'Are You Sure You Want To Schedule An Appointment For ' + searchedStudentParent[0].profile?.first_name + "?",
            btn = (isResched) ? 'Re-Sched Appointment' : 'Schedule Appointment',
            label2 = (isResched) ? 'Re-Scheduling An Appointment'
                                 : 'Scheduling Appointment'

        showWarningModal(
            label,
            btn,
            'Cancel',
            () => {
                props.reload(true, 'text-wait', label2 + '. Please Wait')
                AppointmentService.schedule(isResched, props.appointmentId, appoint, isResched ? props.setData : ()=>{}, success, error)
            }
        )
    }
    const getSearchedStudentParent = (s) => {
        const f = props.student_parent_list.filter((e, i) => e.id == s)
        setSearchedStudentParent(f)
        setSearch('')
        setAppointment((prev) => ({
            ...prev,
            user_id: f[0].id
        }))
    }
    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
    };
    const unselect = () => {
        setSearchedStudentParent(null)
        setAppointment((prev) => ({
            ...prev,
            user_id: props.id
        }))
    }
    const success = () => {
        const message = (isResched) ? 'Appointment Reschedule Sent Successfully'
                                 : 'Appointment Schedule Sent Successfully'
        props.reload(true, '')
        showOutputModal(
            message,
            's',
            () => {
                props.reload(false)
                props.closeModal(false)
            }
        )
    }
    const error = (e) => {
        const message = (isResched) ? 'Failed to Send Appointment Reschedule'
                                    : 'Failed to Send Appointment Schedule'
        props.reload(true, '')
        showOutputModal(
            e.response.data.message || message,
            'e',
            () => {
                props.reload(false)
            }
        )
    }
    return (
        <UpModal 
            close={props.close} 
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor='bg-white'
            w='w-[30rem]'> 
            <div className="w-full">
                <form method="post" onSubmit={handleSubmit}>
                    <div className="grid gap-3">
                        <div className="text-[1.2em] pb-5">
                            <h1><b>{props.label}</b></h1>
                        </div>
                        {(props.user_type == 'sub_admin' && !isResched) &&
                        <div className="grid gap-2">
                            <div className="w-full relative z-10">
                                <SearchUserBar
                                    setSearch={setSearch}
                                    name="search_student_parent"
                                    search={search}
                                    plc="Search Student Name"
                                    handleSearch={handleSearch}
                                    def='Student Not Found'
                                    withLink={false}
                                    click={getSearchedStudentParent}
                                    apiLink="/api/all-users/student"
                                />
                            </div>
                            <div>
                                {(searchedStudentParent) &&
                                <AppointedUser
                                    name={[searchedStudentParent[0].profile?.first_name, searchedStudentParent[0].profile?.last_name]}
                                    src={getProfilePic(searchedStudentParent[0].profile?.profile_picture, searchedStudentParent[0].profile?.sex)}
                                    user_type={(searchedStudentParent[0].role)}
                                    unselect={unselect}
                                />}
                            </div>
                        </div>}
                        {isResched &&
                        <div>
                            {(searchedStudentParent) &&
                            <AppointedUser
                                name={[searchedStudentParent[0].profile?.first_name, searchedStudentParent[0].profile?.last_name]}
                                src={getProfilePic(searchedStudentParent[0].profile?.profile_picture, searchedStudentParent[0].profile?.sex)}
                                user_type={searchedStudentParent[0].role}
                                unselect={null}
                            />}
                        </div>}
                        <div className="grid gap-5">
                            {((!isCancel)
                            ?
                            <>
                            {(isResched) &&
                            <div className="w-full">
                                <FormTextfield
                                    label={`Date to ${isResched ? 'Re-Schedule' : 'Appoint'}`}
                                    name="date_appoint"
                                    type="date"
                                    val={appoint.date_appoint}
                                    change={handleChange}
                                    req={true}
                                    min={todayStr}
                                />
                            </div>}
                            {props.user_type == 'sub_admin' &&
                            <div className="w-full">
                                <FormTextfield
                                    label={`Time to ${isResched ? 'Re-Schedule' : 'Appoint'}`}
                                    name="time_start"
                                    type="time"
                                    val={appoint.time_start}
                                    change={handleChange}
                                    req={true}
                                    min="07:00"
                                    max="16:30"
                                />
                            </div>}
                            </>
                            :
                            '')}
                            <div className="w-full">
                                <RichTextEditor
                                    label={`Reason to ${((isResched) ? 'Re-Schedule' : (isCancel) ? 'Cancel' : 'Appoint')}`}
                                    val={appoint.reason}
                                    change={(html) => setAppointment((prev) => ({ ...prev, reason: html }))}
                                    req={true}
                                    minHeight="10rem"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end w-full">
                            <FormButton type='submit' label={(isResched) ? 'Re-Schedule' : 'Appoint'} />
                        </div>
                    </div>
                </form>
            </div>
        </UpModal>
    )
}
const AppointedUser = (props) => {
    return (
        <div className="grid relative">
            {props.unselect &&
            <div className="absolute">
                <button 
                    type="button" 
                    className="bg-gray-300 relative top-[-0.3rem] z-[5] w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                    onClick={(props.unselect != null) ? () => props.unselect() : ()=>{}}
                >
                    <X size={12} />
                </button>
            </div>}
            <div className="flex gap-2">
                <div>
                    <ProfilePic 
                        activeBorderColor='border-white border-[3px]'  
                        src={props.src} 
                        size={2.5} 
                    />
                </div>
                <div className="text-[0.8em]">
                    <h1 className="text-[1.2em]"><b>{`${props.name[0]} ${props.name[1]}`}</b></h1>
                    <h1 className="text-[0.9em]">{`${toTitleCase(props.user_type)}`}</h1>
                </div>
            </div>
        </div>
    )
}
export default AppointmentModal