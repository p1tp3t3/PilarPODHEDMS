import { Broadcast } from "./broadcast-cofiguration";

export class BroadcastManager extends Broadcast {
    constructor(broadcastType, channel, event, notif = false) {
        super(broadcastType, channel, event)
        this.enableNotification(notif)
        this.setNotificationTitle('')
        this.setNotificationDescription('')
    }
    broadcastCallIn(user) {
        super.setCallBack((res) => {
            if(super.getSetter() != null) {
                super.getSetter()(res.response)
            }
        })
        super.configure('student will be call in')
    }
    broadcastNotif() {
        super.setCallBack((res) => {
            super.getSetter()(res)
        })
        super.configure()
    }
    broadcastComplaintReport() {
        super.setCallBack((res) => {
            super.getSetter()(res.response)
        })
        super.configure('report complaint')
    }
    broadcastComplaintConfirmation() {
        super.setCallBack((res) => {
            super.getSetter()(res.response)
        })
        super.configure('notify complaint confirmation')
    }
    broadcastAbsentSubmission() {
        super.setCallBack((res) => {
            super.getSetter()(res.response)
        })
        super.configure('student absent form requests')
    }
    broadcastAbsentConfirmation() {
        super.setCallBack((res) => {
            super.getSetter()(res.response)
        })
        super.configure('student absent form confirmation')
    }
    broadcastReferral(to, type = 'req') {
        let callBack = (e)=>{}
        switch(to) {
            case 'itrc':
                break
            case 'prefect':
                callBack = (res) => {
                    const notif = (type == 'notif') ? 'notification' : 'referral',
                                  student = res['response']['referral'][0].user

                    console.log('broadcast referral', res)
                    this.setNotificationTitle(`${student.first_name} ${student.last_name} Request A Referral`)
                    this.setNotificationDescription(res['response'][notif]['content'])
                    super.getSetter()(res['response'][notif])
                }
                break
        }
        super.setCallBack(callBack)
        super.configure('student referral requests')
    }
    broadcastReferralConfirmation() {
        super.setCallBack((res) => {
            super.getSetter()(res.response)
        })
        super.configure('confirm referral')
    }
    broadcastAppointmentRequest(to) {
        let callBack = (e)=>{}
        switch(to) {
            case 'itrc':
                callBack = (res) => {
                    console.log('appointment request to the itrc')
                    super.getSetter()(res)
                }
                break
            case 'prefect':
                callBack = (res) => {
                    console.log('complaint request to the prefect')
                    super.getSetter()(res)
                }
                break
        }
        super.setCallBack(callBack)
        super.configure(`notify appointment request`)
    }
    broadcastGatePassRequest() {
        super.setCallBack((res) => {
            console.log(res)
            super.getSetter()(res.response)
        })
        super.configure('send gatepass request')
    }
    setNotificationTitle(s) {
        this.notificationTitle = s
    }
    setNotificationDescription(s) {
        this.notificationDesc = s
    }
    enableNotification(e) {
        this.notif = e
    }
    getNotificationTitle() {
        return this.notificationTitle
    }
    getNotificationDescription() {
        return this.notificationDesc
    }
    isNotifEnabled() {
        return this.notif
    }
}