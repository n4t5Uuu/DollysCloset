import {LucideIcon, Home, ChartArea, IdCardLanyard, Logs, Box} from "lucide-react"

interface SidebarInterface {
    tabName: string
    icon: LucideIcon
}

/**
 * Dictates static sidebar tab properties restricted visually mapping over an `admin` domain environment inherently.
 */
export const adminSidebar: SidebarInterface[] = [
    {
        tabName: "Home",
        icon: Home
    },
    {
        tabName: "Analytics",
        icon: ChartArea
    },
    {
        tabName: "Manage Employees",
        icon: IdCardLanyard
    },
    {
        tabName: "Activity Logs",
        icon: Logs
    },
    {
        tabName: "Manage Inventory",
        icon: Box
    }

]

/**
 * Dictates static sidebar tab properties constrained to standard `employee` role limits natively.
 */
export const employeeSidebar: SidebarInterface[] = [
    {
        tabName: "Home",
        icon: Home
    },
    {
        tabName: "Manage Inventory",
        icon: Box
    }
]