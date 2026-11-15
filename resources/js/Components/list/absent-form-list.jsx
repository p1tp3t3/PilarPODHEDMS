import AuthContext from "@/context-provider/auth-provider"
import { useContext } from "react"
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from "@mui/material"


const AbsentFormList = (props) => {
    const { usr } = useContext(AuthContext)

    return (
        <div className="w-full">
            <TableContainer sx={{ minWidth: "600px" }}>
            <Table sx={{ width: "100%" }}>
                <TableHead sx={{ "& .MuiTableCell-root": { borderBottom: "1px solid #9ca3af" } }}>
                    <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>ID No.</TableCell>
                        {(usr.user_type == 'prefect') &&
                        <TableCell>Student</TableCell>}
                        <TableCell>Requested Since</TableCell>
                        <TableCell>Approved Since</TableCell>
                        <TableCell>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                    <Row type={usr.user_type} />
                </TableBody>
            </Table>
            </TableContainer>
        </div>
    )
}
const Row = ({ type, data }) => {
    return (
        <TableRow>
            <TableCell>text</TableCell>
            <TableCell>text</TableCell>
            {(type == 'prefect') &&
            <TableCell>Student Name</TableCell>}
            <TableCell>text</TableCell>
            <TableCell>text</TableCell>
            <TableCell>text</TableCell>
        </TableRow>
    )
}
export default AbsentFormList
