import { PageActionsContext, PageTitle } from "@/context-provider/page-title-provider"
import { useIsMobile } from "@/others/use-is-mobile"

// Shared page shell. The title goes up into AuthLayout's full-width title
// bar. The right-side action goes in that bar only on phones (as an icon
// button); on tablets/desktops it sits in the page instead — at the top
// right by default, or, with `actionsWithFilters`, wherever the page puts
// <PageActions /> (the end of its filter row). The content keeps the same
// outer spacing/min-w-0 guard every page in this app already hand-rolls —
// min-w-0 matters because these pages nest a MUI DataGrid, whose
// fixed-width columns would otherwise force horizontal overflow.
const PageLayout = ({ title, rightSideComponent, actionsWithFilters = false, children }) => {
    const isMobile = useIsMobile()
    const pagePlacesActions = actionsWithFilters && !isMobile

    return (
        <div className="w-full py-5 min-w-0">
            <PageTitle
                title={title}
                rightSideComponent={rightSideComponent}
                actionsElsewhere={pagePlacesActions}
            />
            <PageActionsContext.Provider value={pagePlacesActions ? rightSideComponent : null}>
                <div className="w-full grid gap-5 relative min-w-0">
                    {children}
                </div>
            </PageActionsContext.Provider>
        </div>
    )
}

export default PageLayout
