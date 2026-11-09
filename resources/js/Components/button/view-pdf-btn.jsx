import ActionBtn from "./action-btn"
import { openPdfTab, showOutputModal } from "@/others/function"

// Opens a record's PDF in a new tab (showing "Generating…" until it's
// ready), never a download. `url` is the record's pdf_url from the server
// (null when it has no PDF or the viewer can't open it).
const ViewPdfBtn = ({ url }) =>
    url ? (
        <ActionBtn
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => openPdfTab(url, "PDF") || showOutputModal("Allow pop-ups for this site so the PDF can open in a new tab.", "e")}
            title="Open the PDF in a new tab"
        >
            View PDF
        </ActionBtn>
    ) : null

export default ViewPdfBtn
