import ActionBtn from "./action-btn"

// Opens a record's PDF in a new tab. `url` is the record's pdf_url from the
// server (null when it has no PDF or the viewer can't open it).
const ViewPdfBtn = ({ url }) =>
    url ? (
        <ActionBtn
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => window.open(url, "_blank", "noopener")}
            title="Open the PDF in a new tab"
        >
            View PDF
        </ActionBtn>
    ) : null

export default ViewPdfBtn
