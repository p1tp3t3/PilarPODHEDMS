import Btn from "@/Components/button/normal-btn"
import SearchUserBar from "@/Components/input/search-user-bar"
import FacultyList from "@/Components/list/faculty-list"
import AuthLayout from "@/Layouts/auth-layout"
import { Head } from "@inertiajs/react"
import { useState } from "react"

const Faculty = (props) => {

    const fileName = props.file_name

    const [search, setSearch] = useState('')

    const handleSearch = (e) => {
        setSearch(e.target.value)
    }
    
    return (
        <>
        <Head title="Faculty List" />
        <div className="w-full py-10">
            <div className="w-full grid gap-10 relative">
                <div className="flex justify-between items-center">
                    <h1 className="text-[1.4em]">
                        <b>Faculty List</b>
                    </h1>
                </div>
                <div className="flex gap-3 justify-between items-center">
                    <div className="w-[18rem] relative">
                        <SearchUserBar
                            setSearch={setSearch}
                            name="search"
                            search={search}
                            plc="Search Faculty Member"
                            handleSearch={handleSearch}
                            lim={5}
                            def='Faculy Member Not Found'
                            withLink={true}
                            link={`/${props.auth.user.user_type}/faculty-list`}
                            param={true}
                            apiLink="/api/all-users/faculty"
                        />
                    </div>
                    {props.auth.user.user_type == 'administrative' &&
                    <div className="flex gap-3 items-center">
                        <a href={`/download/user/account/${fileName}`} download={fileName}>
                            <Btn>
                                <i className="fa-solid fa-download"></i> Download Faculty Accounts
                            </Btn>
                        </a>
                    </div>}
                </div>
                <div>
                    <FacultyList list={props.faculty} />
                </div>
            </div>
        </div>
        </>
    )
}

Faculty.layout = (page) => <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>

export default Faculty