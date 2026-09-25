import UpModal from "../up-modal"
import FormTextfield from "../../input/form-input"
import RichTextEditor from "../../input/rich-text-editor"
import FormButton from "../../button/button"
import '../style.css'
import { useState, useEffect } from "react"
import SearchUserBar from "@/Components/input/search-user-bar"
import SelectedUser from "../../other/selected-user"
import DropdownField from "../../input/dropdown"
import CheckBoxButton from "@/Components/input/checkbox"
import { ComplaintService } from "@/others/services/complaint-service"
import { clearField, showOutputModal, getProfilePic, showWarningModal, toTitleCase, showUserType } from "@/others/function"
import PicVidUpload from "@/Components/input/pic-vid-upload"
import ProfilePic from "@/Components/other/profile-pic"
import { X } from "lucide-react"

const IssueComplaintModal = (props) => {
    const [search, setSearch] = useState(""),
          [complainantSearch, setComplainantSearch] = useState(""),
          [searchedComplainant, setSearchedComplainant] = useState(null),
          [searchedStudent, setSearchedStudent] = useState(null),
          [searchedStudent2, setSearchedStudent2] = useState([]),
          [direct, isDirectComplaint] = useState(false),
          
          [validationError, setValidationError] = useState({
              complainant: '',
              subject: '',
              incident: '',
              reason: '',
              evidence: ''
          })
    
    useEffect(() => {
        if(searchedStudent != null) {
            props.setter((prev) => ({
                ...prev,
                subject: searchedStudent[0].id
            }))
        }else {
            props.setter((prev) => ({
                ...prev,
                subject: ''
            }))
        }
    }, [searchedStudent, props.val.subject])
    useEffect(() => {
        if(direct) {
            props.setter((prev) => ({
                ...prev,
                complainant_name: ''
            }))
        }else {
            props.setter((prev) => ({
                ...prev,
                complainant_name: props.val.complainant_name
            }))
        }
    }, [direct, props.complainant_name])

    const [picture_list, setPictureList] = useState([]),
          [req_picture_list, setReqPictureList] = useState([]),

          [video_list, setVideoList] = useState([]),
          [req_video_list, setReqVideoList] = useState([]),

          [uploadError, setUploadError] = useState('')

    const selectedIncidentKeywords = props.incident_list?.find(
        (i) => i.val == props.val.complaint_incident
    )?.keywords ?? []

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
    };
    
    const handleSubmit = (e) => {
        e.preventDefault()
        const concatFileList = req_picture_list.concat(req_video_list)
        const f = new FormData()

        if(validateForm()) {
            if(direct) {
                f.append('complainant', props.direct_user_id)
            }else if(searchedComplainant) {
                f.append('complainant', searchedComplainant[0].id)
            }else if(props.user.role == 'sub_admin') {
                f.append('complainant_name', props.val.complainant_name)
            }else {
                // Regular (non sub_admin) filer — the complainant UI above is
                // hidden for them, so they're always filing on their own behalf.
                f.append('complainant', props.user.id)
            }
            f.append('subject', searchedStudent2[0]['id'])
            searchedStudent2.forEach((e, i) => f.append(`student_subjects[${i}]`, e['id']))
            f.append('complaint_description', props.val.complaint_description)
            f.append('incident_id', props.val.complaint_incident);


            // Omit `evidence` entirely when nothing was attached — FormData
            // coerces a literal null into the string "null", which Laravel's
            // `nullable|file` rule does NOT treat as empty (nullable only
            // exempts a true absent/null value), so appending a fake null
            // here always failed validation with "must be a file".
            if(concatFileList != null && concatFileList.length > 0) {
                concatFileList.forEach((file, index) => {
                    f.append(`evidence[${index}]`, file);
                })
            }
            showWarningModal(
                'Are You Sure You Want To Submit a Complaint?',
                'Submit Complaint',
                'Cancel',
                () => {
                    clearField(setValidationError)
                    props.reload(true, "text-wait", "Your Complaint is Processing");
                    ComplaintService.create(f, success, error)
                }
            )
        }else {
            console.log('form validation failed')
        }
    }
    const getSelectedStudent = (i) => {
        const select = props.student_list.find((e) => e.id == i);
        setSearchedStudent2((prev) => {
            const alreadyExists = prev.some((student) => student.id === select.id);
            if (alreadyExists) return prev;
            return [...prev, select];
        });
        setSearch('')
    }
    const success = () => {
        // Reload with success message
        props.reload(true, '');
        showOutputModal(
            "Your Complaint Sent Successfully",
            "s",
            () => {
                props.reload(false);
                props.closeModal(false);
                // CLEAR FILE LISTS
                setReqPictureList([]);
                setPictureList([]);
                setReqVideoList([]);
                setVideoList([]);

                // CLEAR SEARCHED STUDENTS
                setSearchedStudent(null);     // for autocomplete input
                setSearchedStudent2([]);      // the selected list

                // CLEAR SEARCHED COMPLAINANT
                setSearchedComplainant(null);
                setComplainantSearch("");
                isDirectComplaint(false);

                // CLEAR ALL COMPLAINT FIELD VALUES
                props.setter((prev) => ({
                    complainant_name: "",
                    complaint_description: "",
                    complaint_incident: "",
                }));
            }
        )
    };
    const error = (e) => {
        props.reload(true, '');
        showOutputModal(
            toTitleCase(e.response.data.message) || "There was an Error. Please Try Again",
            "e",
            () => {
                props.reload(false)
            }
        )
    };
    const removeStudent = (i) => {
        const newList = searchedStudent2.filter((e, index) => index !== i)
        setSearchedStudent2(newList)
    }
    const validateForm = () => {
        let errorMessage = null
        const field = props.val
        
        if((searchedComplainant == null && !direct && props.user.role == 'sub_admin') && (props.val.complainant_name == '' && !direct && props.user.role == 'sub_admin')) {
            errorMessage = {
                ...errorMessage,
                complainant: "This is Required. Please Specify the Complainant"
            }
        }else {
            errorMessage = {
                ...errorMessage,
                complainant: ""
            }
        }
        if(searchedStudent2.length == 0) {
            errorMessage = {
                ...errorMessage,
                subject: "This Is Required. Please Specify The Subject Of Complaint"
            }
        }else if(field.subject == field.complainant) {
            errorMessage = {
                ...errorMessage,
                subject: "Complainant Cannot Be The Subject"
            }
        }else {
            errorMessage = {
                ...errorMessage,
                subject: ""
            }
        }if(field.complaint_incident == '' || field.complaint_incident == null) {
            errorMessage = {
                ...errorMessage,
                incident: "This Is Required. Please Select An Incident That You Want To Report"
            }
        }else {
            errorMessage = {
                ...errorMessage,
                incident: ""
            }
        }if(field.complaint_description == '') {
            errorMessage = {
                ...errorMessage,
                reason: "This Is Required. Please State Your Reason To Complaint"
            }
        }else {
            errorMessage = {
                ...errorMessage,
                reason: ""
            }
        }
        const allEmptyStrings = Object.values(errorMessage).every(value => value == '')

        if(!allEmptyStrings) {
            setValidationError((prev) => ({
                ...prev,
                ...errorMessage
            }))
            return false
        }
        return true
    }

    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[40rem] sm:w-[45rem]"
        >
            <div className="w-full">
                <div className="pt-2 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Who do you want to Complaint?</b></h1>
                </div>
                <div className="py-3 w-full">
                    <form onSubmit={handleSubmit} method="post" className="grid gap-4">
                        {(props.user.role == 'sub_admin') &&
                        <div className="flex flex-wrap items-center gap-2">
                            <CheckBoxButton.CheckBox
                                id="direct-complaint"
                                name="direct-complaint"
                                label="Direct Complaint"
                                checked={direct}
                                change={(e) => isDirectComplaint(e.target.checked)}
                            />
                        </div>}

                        {/* Complainant */}
                        {(!direct && props.user.role == 'sub_admin') &&
                        <div className="grid gap-3">
                            {(!searchedComplainant && !props.val.complainant_name) &&
                            <div className="w-full relative z-20">
                                <div className="text-[0.9em] mb-1">Search Complainant (if registered)</div>
                                <SearchUserBar
                                    setSearch={setComplainantSearch}
                                    name="complainant_search"
                                    search={complainantSearch}
                                    plc="Search by name or ID number"
                                    handleSearch={(e) => setComplainantSearch(e.target.value)}
                                    lim={4}
                                    list={[]}
                                    def="User Not Found"
                                    withLink={false}
                                    apiLink="/api/all-users/all-2"
                                    click={(id, fullUser) => {
                                        setSearchedComplainant([fullUser])
                                        setComplainantSearch('')
                                        props.setter((prev) => ({ ...prev, complainant_name: '' }))
                                    }}
                                />
                            </div>}

                            {!searchedComplainant &&
                            <div className="w-full relative">
                                <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center">
                                    <div className="w-full">
                                        <FormTextfield
                                            label="Or Enter Complainant's Name (if not registered)"
                                            name="complainant_name"
                                            id="complainant_name"
                                            val={props.val.complainant_name}
                                            change={props.change}
                                        />
                                    </div>
                                </div>
                                <div className="text-[#d12323] text-[12px]">
                                    <b>{validationError.complainant}</b>
                                </div>
                            </div>}

                            {(searchedComplainant) &&
                            <div className="grid gap-1">
                                <div className="text-[0.8em]">Complainant:</div>
                                <SelectedUser
                                    src={getProfilePic(searchedComplainant[0].profile?.profile_picture, searchedComplainant[0].profile?.sex)}
                                    name={[searchedComplainant[0].profile?.first_name, searchedComplainant[0].profile?.last_name]}
                                    user={searchedComplainant[0]}
                                    unselect={setSearchedComplainant}
                                />
                            </div>}
                        </div>}

                        {/* Subject */}
                        <div className="grid gap-2">
                            <div className="w-full relative z-10">
                                {<SearchUserSection 
                                    label=""
                                    setSearch={setSearch}
                                    name="student_search"
                                    search={search}
                                    plc="Search Student/s as the Subject of Complaint"
                                    handleSearch={handleSearch}
                                    searchList={searchedStudent2}
                                    def="Student Not Found"
                                    getSelect={getSelectedStudent}         
                                    unselect={removeStudent}     
                                />}
                                <div className="text-[#d12323] text-[12px]">
                                    <b>{validationError.subject}</b>
                                </div>
                            </div>
                            {(searchedStudent) &&
                            <div className="grid gap-1">
                                <div className="text-[0.8em]">Subjected Student:</div>
                                <SelectedUser
                                    src={getProfilePic(searchedStudent[0].profile?.profile_picture, searchedStudent[0].profile?.sex)}
                                    name={[searchedStudent[0].profile?.first_name, searchedStudent[0].profile?.last_name]}
                                    user={searchedStudent[0]}
                                    unselect={setSearchedStudent}
                                />
                            </div>}
                        </div>

                        {/* Incident Dropdown */}
                        <div className="w-full relative">
                            <div className="grid gap-3 relative">
                                <DropdownField.Search
                                    default={{ val: '', label: 'Select Incident' }}
                                    list={props.incident_list}
                                    onChange={props.change}
                                    name="complaint_incident"
                                    val={props.val.complaint_incident}
                                    req={false}
                                />
                            </div>
                            {selectedIncidentKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {selectedIncidentKeywords.map((kw, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                            )}
                            {validationError.incident &&
                            <div className="text-[#d12323] text-[12px]">
                                <b>{validationError.incident}</b>
                            </div>}
                        </div>

                        {/* Reason */}
                        <RichTextEditor
                            label="State Your Reason About the Complaint"
                            val={props.val.complaint_description}
                            change={(html) => props.change({ target: { name: "complaint_description", value: html } })}
                            error={validationError.reason}
                            minHeight="12rem"
                        />

                        {/* Evidence Upload */}
                        <div className="grid gap-2">
                            <div className="text-[0.9em] font-semibold">Provide Strong Evidence</div>
                            <PicVidUpload
                                type='pic'
                                label="5 JPEG or PNG File Only"
                                multiple={true}
                                def='Upload Pics Here Up To 2MB'
                                fileList={picture_list}
                                name='pic_evidence'
                                id='pic_file'
                                reqFileList={req_picture_list}
                                setFileList={setPictureList}
                                setReqFileList={setReqPictureList}
                                maximumSize={2}
                                maxCount={5}
                                onError={(msg) => setUploadError(msg)}
                            />
                            <PicVidUpload
                                type='vid'
                                label="Up To 2 Videos, 3 Minutes Each Max"
                                multiple={true}
                                def='Upload Videos Here Up To 40MB'
                                fileList={video_list}
                                name='vid_evidence'
                                id='vid_file'
                                reqFileList={req_video_list}
                                setFileList={setVideoList}
                                setReqFileList={setReqVideoList}
                                maximumSize={40}
                                maxCount={2}
                                maxDurationSeconds={180}
                                onError={(msg) => setUploadError(msg)}
                            />
                            {uploadError && (
                                <div className="text-[#d12323] text-[12px]">
                                    <b>{uploadError}</b>
                                </div>
                            )}
                            <div className="text-[#d12323] text-[12px]">
                                <b>{validationError.evidence}</b>
                            </div>
                        </div>

                        <div className="w-full flex justify-end pt-2">
                            <FormButton label='Submit' type="submit" />
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}
const SearchUserSection = ({ 
    label, 
    setSearch, 
    isSearchFocus, 
    name, 
    plc, 
    focusSearch, 
    handleSearch, 
    search, 
    searchList,
    list, 
    def, 
    getSelect,
    unselect,
    user
}) => {
    const path = window.location.pathname.includes('profile') ? '../' : ''
    return (
        <div className="grid gap-2">
            <div className="text-[0.9em]">{label}</div>
            <div className="relative">
                <SearchUserBar
                    setSearch={setSearch}
                    name={name}
                    search={search}
                    isFocus={isSearchFocus}
                    plc={plc}
                    focus={focusSearch}
                    handleSearch={handleSearch}
                    lim={4}
                    list={searchList}
                    def={def}
                    withLink={false}
                    click={getSelect}
                    apiLink="/api/all-users/student"
                />
            </div>
            <div className="flex overflow-y-hidden overflow-x-auto w-full">
                {searchList.length != 0
                    ? searchList.map((e, i) => (
                        <SelectedUser2
                            key={i} 
                            src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)}
                            name={[e.profile?.first_name, e.profile?.last_name]}
                            user={e}
                            unselect={unselect}
                            index={i}
                        />
                    ))
                    : ""}                
            </div>
        </div>
    )
}
const SelectedUser2 = (props) => {

    const isStudent = showUserType(props.user, true)
    return (
        <div className="flex-shrink-0 grid relative w-[5rem]">
            <div className="justify-self-center grid">
                <div>
                    <div className="grid w-[2.5rem] justify-self-center">
                        {props.unselect &&
                        <div className="absolute">
                            <button 
                                type="button" 
                                className="bg-gray-300 relative top-[-0.3rem] z-[5] w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                                onClick={() => props.unselect(props.index)}
                            >
                                <X size={12} />
                            </button>
                        </div>}
                        <div className="justify-self-center">
                            <ProfilePic 
                                src={props.src} 
                                size={2.5} 
                            />
                        </div>
                    </div>
                    <div className="text-[0.7em] text-center">
                        <h1><b>{`${props.name[0]} ${props.name[1]} (${isStudent})`}</b></h1>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default IssueComplaintModal
