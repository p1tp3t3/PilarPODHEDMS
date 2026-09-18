// Shared page shell: the "title + optional right-side action" header row,
// wrapped in the same outer spacing/min-w-0 guard every page in this app
// already hand-rolls (see prefect/report.jsx, prefect/gatepass.jsx before
// this) — min-w-0 matters here specifically because these pages nest a
// MUI DataGrid, whose fixed-width columns will force the whole page into
// horizontal overflow unless every ancestor grid/flex item can shrink.
const PageLayout = ({ title, rightSideComponent, children }) => {
    return (
        <div className="w-full py-4 min-w-0">
            <div className="w-full grid gap-5 relative min-w-0">
                <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
                    <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">{title}</h1>
                    {rightSideComponent}
                </div>
                {children}
            </div>
        </div>
    )
}

export default PageLayout
