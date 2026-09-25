import UpModal from "../up-modal"
import { useContext, useState } from "react"
import FormButton from "../../button/button"
import RichTextEditor from "@/Components/input/rich-text-editor"
import { change, clearField, showOutputModal, getProfilePic } from "../../../others/function"
import SearchUserBar from "@/Components/input/search-user-bar"
import AuthContext from "@/context-provider/auth-provider"
import SelectedUser from "../../other/selected-user"
import { AppointmentService } from "@/others/services/appointment-service"
import CheckBoxButton from "@/Components/input/checkbox"
import { Phone, TriangleAlert } from "lucide-react"

const CallInModal = (props) => {
    const { showToast } = useContext(AuthContext)

    const [search, setSearch] = useState(""),
          [isSearchFocus, focusSearch] = useState(false),
          [submit, setSubmit] = useState(false),
          [searchedStudent, setSearchedStudent] = useState(null),
          [data, setData] = useState({
              'sender_id': props.user_id,
              'receiver_id': '',
              'call_in_reason': '',
              'notify_program_head' : false,
              'program_head_message': '',
          }),
          [validationErr, setValidationError] = useState({})

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
    };
    const handleChange = (e) => {
        change(e, setData)
    }
    const handleCheck = (e) => {
        const { name, checked } = e.target;
        setData((prev) => ({
            ...prev,
            [name]: checked,
            // Clear a half-written program head message if the checkbox
            // gets unchecked, so it doesn't linger and get sent later.
            ...(name === 'notify_program_head' && !checked ? { program_head_message: '' } : {}),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault()
        const f = (e)=>{}
        if(!submit) {
            setSubmit(true)
            AppointmentService.callIn(data, success, error)
        }
    }
    const getSearchedStudent = (s) => {
        const f = props.student_list.filter((e, i) => e.id == s)
        setSearchedStudent(f)
        setData((prev) => ({
            ...prev,
            receiver_id: f[0].id
        }))
        setSearch('')
    }
    const success = () => {
        showToast(`${searchedStudent[0].profile?.first_name} Will Now Be Called In`, Phone)
        props.closeModal(false)
        setData((prev) => ({
            ...prev,
            receiver_id: '',
            call_in_reason: '',
            notify_program_head: false,
            program_head_message: '',
        }))
        setSearchedStudent(null)
        setSubmit(false)
    }
    const error = (e) => {
        const m = e.response.data.message
        showToast('Failed to Call In Student. ' + m, TriangleAlert, 'error')
        setSubmit(false)
    }
    //
    const path = (window.location.pathname.includes('profile')) ? '../' : ''
    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[30rem] max-w-[90vw]"  // Increased width and made responsive
        >
            <div className="w-full py-2">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">Who do you want to Call In?</h1>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative z-10">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search for Student</label>
                            <SearchUserBar
                                setSearch={setSearch}
                                name="search_call_in_student"
                                search={search}
                                isFocus={isSearchFocus}
                                plc="Search Student Full Name / ID"
                                focus={focusSearch}
                                handleSearch={handleSearch}
                                lim={5}
                                list={props.student_list}
                                def='Students Not Found'
                                withLink={false}
                                click={getSearchedStudent}
                                apiLink="/api/all-users/student"
                            />
                        </div>
                        {searchedStudent && (
                            <div className="">
                                <h3 className="text-sm font-semibold">Selected Student</h3>
                                <SelectedUser
                                    src={getProfilePic(searchedStudent[0].profile?.profile_picture, searchedStudent[0].profile?.sex)}
                                    name={[searchedStudent[0].profile?.first_name, searchedStudent[0].profile?.last_name]}
                                    user={searchedStudent[0]}
                                    unselect={setSearchedStudent}
                                />
                            </div>
                        )}
                        <div>
                            <RichTextEditor
                                label="Enter Your Message"
                                val={data.call_in_reason}
                                change={(html) => setData((prev) => ({ ...prev, call_in_reason: html }))}
                                minHeight="8rem"
                            />
                        </div>
                        <div className="flex items-center space-x-2 text-[0.8em]">
                            <CheckBoxButton.CheckBox
                                label="Notify Program Head"
                                name="notify_program_head"
                                id="notify_program_head"
                                change={handleCheck}
                                checked={data.notify_program_head}
                            />
                        </div>
                        {data.notify_program_head && (
                            <div>
                                <RichTextEditor
                                    label="Message to Program Head"
                                    val={data.program_head_message}
                                    change={(html) => setData((prev) => ({ ...prev, program_head_message: html }))}
                                    minHeight="8rem"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <FormButton label='Call In' type="submit" loading={submit} />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default CallInModal
