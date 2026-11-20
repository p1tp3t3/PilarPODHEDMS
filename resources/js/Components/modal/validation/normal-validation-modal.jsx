import AlertModal from "../alert-modal"

const NormalValidationModal = (props) => {
    const Icon = props.icon
    return (
        <AlertModal
            close={props.close}
            pd={["", "pt-4"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[23rem]">
            <div className="w-full">
                <div className="grid gap-3">
                    <div className="justify-self-center text-center">
                        {(Icon != null) &&
                        <div>
                            <Icon size="4.5em" />
                        </div>}
                        {props.title != null &&
                        <h1 className="text-center text-[2em]">
                            <b>File Upload</b>
                        </h1>}
                    </div>
                    <p className="text-[0.9em] text-center px-10">
                        {props.label}
                    </p>
                    <div className="justify-self-end flex text-[0.8em] w-full">
                        {props.btn.map((e, i) =>
                        <button
                            key={e.label ?? i}
                            type="button"
                            className={`px-4 py-4 border w-full ${(e.satisfied) ? 'bg-blue-600 text-white border-none' :  ''}`}
                            onClick={e.click}
                        >
                            {e.label}
                        </button>
                        )}
                    </div>
                </div>
            </div>
        </AlertModal>
    )
}
export default NormalValidationModal