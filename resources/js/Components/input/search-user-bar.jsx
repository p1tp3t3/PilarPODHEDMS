import SearchBar from "../input/search-bar"
import UserProfileList from "../list/search-user-list"
import LabelList from "../list/label-list"
import { useEffect, useRef, useState } from "react"
import { Popper } from "@mui/material"
import { UserService } from "@/others/services/user-service"

const SearchUserBar = ({ 
    setSearch, 
    search, 
    plc, 
    name,
    isSearchFocus, 
    focusSearch, 
    handleSearch, 
    list, 
    userType, 
    withLink,
    click,
    param = false,
    link,
    lim,
    def,
    profile = true,
    label = null,
    apiLink = '',
    type = 'id'
}) => {
    
    const [typingTimeout, setTypingTimeout] = useState(null)
    const [searchList, setSearchList] = useState((apiLink != '') ? null : list)
    // The results float in their own layer on top of the page (a portal),
    // anchored under the search bar, so a modal or a scrolling box can't clip
    // them; they open above the bar when there's no room below.
    const anchorRef = useRef(null)

    useEffect(() => {
        if (search === '') return;

        if(apiLink != '') {
            setSearchList(null)
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            const timeout = setTimeout(() => {
                console.log('Go');
                UserService.search(apiLink, search, setSearchList)
            }, 2000);

            setTypingTimeout(timeout);

            return () => clearTimeout(timeout);
        }
    }, (apiLink != '') ? [search] : [])


    return (
        <>
        <div ref={anchorRef} className="w-full">
            <SearchBar
                setSearch={setSearch}
                name={name}
                search={search}
                isFocus={isSearchFocus}
                plc={plc}
                focus={focusSearch}
                handleSearch={handleSearch}
                w="w-full"
            />
        </div>
        <Popper
            open={search.length != 0 && !!anchorRef.current}
            anchorEl={anchorRef.current}
            // Inside a modal: in the modal's outer layer (above its panel, not
            // clipped by it, and hidden with it when it closes).
            container={() => anchorRef.current?.closest(".MuiDialog-root") ?? document.body}
            placement="bottom-start"
            // Over modals (z 200), under the full-page loader.
            sx={{ zIndex: 210, width: anchorRef.current?.offsetWidth }}
            modifiers={[
                { name: "offset", options: { offset: [0, 6] } },
                { name: "flip", options: { fallbackPlacements: ["top-start"] } },
                { name: "preventOverflow", options: { padding: 8 } },
            ]}
        >
                {profile
                ?
                <UserProfileList
                    list={searchList}
                    lim={lim}
                    search={search}
                    authType={userType}
                    withLink={withLink}
                    event={click}
                    type={type}
                    param={param}
                    default={def}
                    link={link}
                />
                :
                <LabelList
                    list={searchList}
                    lim={lim}
                    search={search}
                    withLink={withLink}
                    event={click}
                    default={def}
                    link={link}
                    isProfile={false}
                    label={label}
                />}
        </Popper>
        </>
    )
}
export default SearchUserBar