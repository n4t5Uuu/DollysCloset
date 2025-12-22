import {LucideIcon, Home, ChartArea, IdCardLanyard, Logs, Box} from "lucide-react"

interface SidebarInterface {
    tabName: string
    icon: LucideIcon
}

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