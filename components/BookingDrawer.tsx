"use client";

import { useEffect, useState } from "react";

interface Booking {
    id: string;
    customerName: string;
    customerEmail: string;
    customerImage: string;
    serviceName: string;
    date: string;
    time: string;
    duration: string;
    price: string;
    status: string;
    phone: string;
    meetingLink: string;
    message: string;
}

interface BookingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
}

export default function BookingDrawer({ isOpen, onClose, booking }: BookingDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [contactStatus, setContactStatus] = useState<"not-contacted" | "contacted">("not-contacted");

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!booking && !isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 right-0 z-[101] w-full max-w-lg bg-white dark:bg-[#111] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {booking && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 border-b border-black/5 dark:border-white/5">
                            <h2 className="text-2xl font-black">Booking Details</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* User Profile */}
                            <div className="flex flex-col items-center text-center">
                                <div className="size-32 rounded-full overflow-hidden border-4 border-white dark:border-black shadow-xl mb-6">
                                    <img src={booking.customerImage} alt={booking.customerName} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">{booking.customerName}</h3>
                                <p className="text-black/40 dark:text-white/40 font-medium">{booking.customerEmail}</p>
                            </div>

                            {/* Status Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/[0.03] dark:bg-white/[0.03] p-6 rounded-[2rem]">
                                    <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Payment Status</p>
                                    <p className="font-black text-sm">PAID {booking.price}</p>
                                </div>
                                <div className="bg-black/[0.03] dark:bg-white/[0.03] p-6 rounded-[2rem] flex flex-col justify-between">
                                    <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Statut de la consultation</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-sm text-green-500 uppercase">{booking.status}</p>
                                        <span className="material-symbols-outlined text-black/20 dark:text-white/20">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3 ml-4">Phone Number</p>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-black/20 dark:text-white/20">call</span>
                                    <input
                                        type="text"
                                        defaultValue={booking.phone}
                                        className="w-full bg-transparent border-2 border-black/5 dark:border-white/10 rounded-full py-4 pl-14 pr-6 font-bold text-sm focus:border-primary transition-colors outline-none"
                                    />
                                </div>
                            </div>

                            {/* Contact Status Toggle */}
                            <div>
                                <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3 ml-4">Contact Status</p>
                                <div className="grid grid-cols-2 p-1.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-full">
                                    <button
                                        onClick={() => setContactStatus("not-contacted")}
                                        className={`py-3 rounded-full text-[10px] font-black uppercase transition-all ${contactStatus === "not-contacted" ? "bg-white dark:bg-[#222] shadow-sm text-primary dark:text-white" : "text-black/30 dark:text-white/30"}`}
                                    >
                                        Not Contacted
                                    </button>
                                    <button
                                        onClick={() => setContactStatus("contacted")}
                                        className={`py-3 rounded-full text-[10px] font-black uppercase transition-all ${contactStatus === "contacted" ? "bg-white dark:bg-[#222] shadow-sm text-primary dark:text-white" : "text-black/30 dark:text-white/30"}`}
                                    >
                                        Contacted
                                    </button>
                                </div>
                            </div>

                            {/* Consultation & Timing */}
                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest ml-4">Consultation & Horaire</p>
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-black/30 dark:text-white/30">calendar_month</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-sm">{booking.date}</p>
                                        <p className="text-xs text-black/40 dark:text-white/40 font-bold">{booking.time} ({booking.duration})</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-black/30 dark:text-white/30">video_camera_front</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-sm mb-2">{booking.serviceName}</p>
                                        <input
                                            type="text"
                                            defaultValue={booking.meetingLink}
                                            className="w-full bg-transparent border border-black/10 dark:border-white/10 rounded-lg p-2 text-xs font-medium text-blue-500 focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Customer Message */}
                            <div>
                                <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-3 ml-4">Customer Message</p>
                                <div className="bg-black/[0.03] dark:bg-white/[0.03] p-6 rounded-[2rem] relative">
                                    <p className="text-xs font-semibold leading-relaxed text-black/60 dark:text-white/60">
                                        {booking.message}
                                    </p>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                        <span className="material-symbols-outlined text-black/10 text-xl cursor-default">arrow_drop_up</span>
                                        <div className="w-3 h-8 bg-black/10 rounded-full"></div>
                                        <span className="material-symbols-outlined text-black/10 text-xl cursor-default">arrow_drop_down</span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Log */}
                            <div className="pb-10">
                                <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-6 ml-4">Activity Log</p>
                                <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-black/5 dark:before:bg-white/5">
                                    <div className="relative">
                                        <div className="absolute -left-[25px] top-1.5 size-3 rounded-full bg-primary dark:bg-white ring-4 ring-white dark:ring-[#111]" />
                                        <p className="text-sm font-black">Marked as Completed</p>
                                        <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase">{booking.date} • 11:35 AM</p>
                                    </div>
                                    <div className="relative opacity-40">
                                        <div className="absolute -left-[25px] top-1.5 size-3 rounded-full bg-black/20 dark:bg-white/20 ring-4 ring-white dark:ring-[#111]" />
                                        <p className="text-sm font-black">Booking Confirmed</p>
                                        <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase">Oct 05, 2024 • 09:12 AM</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-8 border-t border-black/5 dark:border-white/5 space-y-3 bg-white dark:bg-[#111]">
                            <button className="w-full bg-primary text-white dark:bg-white dark:text-primary h-16 rounded-full font-black text-sm uppercase tracking-tight hover:opacity-90 transition-opacity">
                                Update Details
                            </button>
                            <div className="flex gap-3">
                                <button className="flex-1 bg-black/[0.05] dark:bg-white/[0.05] h-14 rounded-full font-black text-sm hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all">
                                    Reschedule
                                </button>
                                <button className="size-14 flex items-center justify-center rounded-full border-2 border-black/5 dark:border-white/5 hover:border-red-500 hover:text-red-500 transition-all">
                                    <span className="material-symbols-outlined text-xl">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
