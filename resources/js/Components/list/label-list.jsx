import { Link } from "@inertiajs/react"
import ListSkeleton from "../reload/list-skeleton"
import { Search } from "lucide-react"

const LabelList = (props) => {

    const convertToObject = (list) => {
        return list.map((item) => {
            return {
                id: item.id,
                label: item[props.label],
            }
        })
    }
    return (
        <div className="absolute w-full bg-white shadow-md shadow-black/20 px-3 py-3 z-10">
            <div className="w-full">
                {((props.list != null)
                    ?
                    ((props.list.length != 0)
                    ?
                    convertToObject(props.list).map((e, i) => 
                            <div className="w-full" key={i}>
                                <Row
                                    name={`${e['label']}`} 
                                    withLink={props.withLink}
                                    event={() => props.event(e.id, e.label)}
                                    id={e.id}
                                    link={props.link}
                                />
                            </div>
                        )
                    :<div className="w-full flex items-center justify-center gap-2 py-3 text-[0.9em] font-semibold text-gray-600">
                        <Search size={15} className="shrink-0" />
                        <span>{(props.default) ? props.default : "User Not Found"}</span>
                    </div>)
                    :
                    <div className="flex justify-center items-center w-full">
                        <ListSkeleton rows={3} />
                    </div>)}
            </div>
        </div>
    )
}
const Row = (props) => {
    return (
        <>
        {(props.withLink)
        ?
        <Link href={`${props.link}?search=${props.id}`}>
            <div className="flex px-2 py-1 items-center gap-2 hover:bg-gray-200">
                <div className="text-[0.9em]">
                    {(props.link.includes('family') ? `${props.name} Family` : props.name)}
                </div>
            </div>
        </Link>
        :
        <div 
            className="flex px-3 py-2 items-center gap-2 hover:bg-gray-200 rounded-lg cursor-pointer"
            onClick={props.event}
        >
            <div className="text-[0.8em]">
                <h1 className="text-[1.2em]"><b>{props.name}</b></h1>
            </div>
        </div>}
        </>
    )
}
export default LabelList