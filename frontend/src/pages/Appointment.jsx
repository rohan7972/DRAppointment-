import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)

    const [docInfo, setDocInfo] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [timeSlots, setTimeSlots] = useState([])
    const [slotTime, setSlotTime] = useState('')

    const navigate = useNavigate()

    // Compute today's date string and 30 days ahead in YYYY-MM-DD format
    const today = new Date()
    const minDate = today.toISOString().split('T')[0]
    const maxDateObj = new Date()
    maxDateObj.setDate(today.getDate() + 30)
    const maxDate = maxDateObj.toISOString().split('T')[0]

    const fetchDocInfo = async () => {
        const doc = doctors.find((doc) => doc._id === docId)
        setDocInfo(doc)
    }

    const generateTimeSlots = (dateStr) => {
        if (!docInfo || !dateStr) return

        const pickedDate = new Date(dateStr)
        const now = new Date()

        // Format slotDate key as "day_month_year"
        const day = pickedDate.getDate()
        const month = pickedDate.getMonth() + 1
        const year = pickedDate.getFullYear()
        const slotDateKey = `${day}_${month}_${year}`

        const alreadyBooked = docInfo.slots_booked[slotDateKey] || []

        // Determine start hour
        let startHour = 10
        let startMinute = 0

        const isToday =
            pickedDate.getDate() === now.getDate() &&
            pickedDate.getMonth() === now.getMonth() &&
            pickedDate.getFullYear() === now.getFullYear()

        if (isToday) {
            startHour = now.getHours() >= 10 ? now.getHours() + 1 : 10
            startMinute = now.getMinutes() > 30 ? 30 : 0
        }

        const slots = []
        const cursor = new Date(pickedDate)
        cursor.setHours(startHour, startMinute, 0, 0)

        const endTime = new Date(pickedDate)
        endTime.setHours(21, 0, 0, 0)

        while (cursor < endTime) {
            const formattedTime = cursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const isBooked = alreadyBooked.includes(formattedTime)

            slots.push({ 
                time: formattedTime, 
                isBooked: isBooked 
            })

            cursor.setMinutes(cursor.getMinutes() + 30)
        }

        setTimeSlots(slots)
        setSlotTime('') // reset time selection when date changes
    }

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value)
        generateTimeSlots(e.target.value)
    }

    const bookAppointment = async () => {
        if (!token) {
            toast.warning('Login to book appointment')
            return navigate('/login')
        }

        if (!selectedDate) {
            toast.warning('Please select a date')
            return
        }

        if (!slotTime) {
            toast.warning('Please select a time slot')
            return
        }

        const d = new Date(selectedDate)
        const slotDate = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`

        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/book-appointment',
                { docId, slotDate, slotTime },
                { headers: { token } }
            )
            if (data.success) {
                toast.success(data.message)
                getDoctosData()
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (doctors.length > 0) {
            fetchDocInfo()
        }
    }, [doctors, docId])

    // When docInfo loads, pre-select today and load its slots
    useEffect(() => {
        if (docInfo) {
            const todayStr = new Date().toISOString().split('T')[0]
            setSelectedDate(todayStr)
            generateTimeSlots(todayStr)
        }
    }, [docInfo])

    return docInfo ? (
        <div>

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>

                    {/* ----- Doc Info : name, degree, experience ----- */}
                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>
                        {docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" />
                    </p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>
                            About <img className='w-3' src={assets.info_icon} alt="" />
                        </p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>
                        Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span>
                    </p>
                </div>
            </div>

            {/* -------- Booking Section -------- */}
            <div className='sm:ml-72 sm:pl-4 mt-10 font-medium text-[#565656]'>

                {/* Step 1: Date Picker */}
                <p className='text-base mb-3'>Select Appointment Date</p>
                <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={selectedDate}
                    onChange={handleDateChange}
                    className='border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer'
                />

                {/* Step 2: Time Slots */}
                <p className='text-base mt-8 mb-3'>
                    {selectedDate
                        ? `Available Time Slots for ${new Date(selectedDate).toDateString()}`
                        : 'Select a date to see available slots'}
                </p>

                {selectedDate && (
                    timeSlots.length > 0 ? (
                        <div className='flex flex-wrap gap-3 mt-2'>
                            {timeSlots.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => !item.isBooked && setSlotTime(item.time)}
                                    disabled={item.isBooked}
                                    className={`px-5 py-2 rounded-full text-sm border transition-all 
                                        ${item.isBooked 
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                                            : item.time === slotTime
                                                ? 'bg-primary text-white border-primary cursor-pointer'
                                                : 'text-[#949494] border-[#B4B4B4] hover:border-primary hover:text-primary cursor-pointer'
                                        }`}
                                >
                                    {item.time.toLowerCase()}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className='text-sm text-red-400 font-light mt-2'>
                            No available slots on this date. Please try another date.
                        </p>
                    )
                )}

                <button
                    onClick={bookAppointment}
                    className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full mt-10 hover:scale-105 transition-all duration-200'
                >
                    Book Appointment
                </button>
            </div>

            {/* Listing Related Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment