import UpModal from "../up-modal";
import DropdownField from "@/Components/input/dropdown";
import BetweenTextfield from "@/Components/input/between-input";
import { requestType } from "@/others/list/type-list";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "@/Components/button/button";
import { useEffect, useState } from "react";
import { LabeledCheckbox } from "@/Components/input/select-checkbox";


const SetAvailabilityModal = (props) => {

    const [data, setData] = useState({
        date_available: props.date,   
        request_type: '',
        from: '',   
        to: '',
        slots: ''
    })

    const [between, enableBetween] = useState(false),
          [available, setAvailable] = useState(false)

    useEffect(() => {
        const date = new Date(props.date)
        const formattedDate = date.getFullYear() + "-" + 
                                String(date.getMonth() + 1).padStart(2, "0") + "-" + 
                                String(date.getDate()).padStart(2, "0");
        setData((prev) => ({
            ...prev,
            date_available: formattedDate
        }))
    }, [data.date_available, props.date])

    const handleSubmit = (e) => {
        e.preventDefault();
    };

    
    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            pd={["px-5", "py-7"]}
            isEnableOuterClose={true}
            w='w-[30rem]'
        >
            <div className="w-full">
                <div className="w-full">
                    <form method="post" onSubmit={handleSubmit}>
                        <div className="grid gap-2">
                            <div className="text-[1.2em] pb-3">
                                <h1><b>{props.label}</b></h1>
                            </div>                        
                            <div>
                                <div className="text-[0.9em]">
                                    <LabeledCheckbox label="Currently Available" name="available" id="available" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
                                </div>
                            </div>
                            {available &&
                            <>
                            
                            <div>
                                <BetweenTextfield
                                    name="from"
                                    labels={['Time From', 'Time To']}
                                    id={['from', 'to'   ]}
                                    type="time"
                                    placeholder="Select time"
                                />
                            </div>
                            <div>
                                <FormTextfield 
                                    label="Maximum Requests"
                                    name="slots"
                                    type="number"
                                    color={{ border: 'border-blue-700', bg: 'bg-gray-200' }}
                                />
                            </div>
                            </>}
                            <div className="flex justify-end">
                                <FormButton label='Set Availability' type='submit' />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}

export default SetAvailabilityModal;