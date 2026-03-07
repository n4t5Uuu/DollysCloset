import {Facebook, Instagram, MessageCircle, Phone} from "lucide-react";

/**
 * Centralized list reflecting predefined contact configurations matched logically against visual Lucide icons.
 * Forms baseline iterative elements representing generic footers or contact UI bounds.
 */
export const contactMethods = [
    {
        icon: Facebook,
        label: "Facebook",
        value: "Dolly's Closet",
        link: "#",
        color: "from-blue-500 to-blue-600",
    },
    {
        icon: Instagram,
        label: "Instagram",
        value: "@dollyscloset",
        link: "#",
        color: "from-pink-500 to-purple-600",
    },
    {
        icon: MessageCircle,
        label: "Viber",
        value: "Shierly Gonzales",
        link: "#",
        color: "from-purple-500 to-purple-600",
    },
    {
        icon: Phone,
        label: "Contact Number",
        value: "+63 912 1234 123",
        link: "tel:+639121234123",
        color: "from-green-500 to-green-600",
    },
];