"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logo from "@/assets/images/logo/logo.jpg";
import Link from "next/link";

// change the import of icons since its deprecated
import {Facebook, Instagram} from "lucide-react";

type FooterContactDetails = {
    facebookLink: string;
    instagramLink: string;
    address: string;
};

const defaultFooterContactDetails: FooterContactDetails = {
    facebookLink: "#",
    instagramLink: "#",
    address: "04 Admiral, Talon Tres, Las Pinas City",
};

function parseFooterContactBody(rawBody: unknown): FooterContactDetails {
    if (!rawBody) {
        return defaultFooterContactDetails;
    }

    if (typeof rawBody === "object") {
        return {
            ...defaultFooterContactDetails,
            ...(rawBody as Partial<FooterContactDetails>),
        };
    }

    if (typeof rawBody !== "string") {
        return defaultFooterContactDetails;
    }

    try {
        const parsed = JSON.parse(rawBody) as Partial<FooterContactDetails>;
        return {
            ...defaultFooterContactDetails,
            ...parsed,
        };
    } catch {
        return defaultFooterContactDetails;
    }
}

function normalizeExternalLink(url: string): string {
    const trimmed = url.trim();
    if (!trimmed || trimmed === "#") return "#";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

export default function Footer() {

    const [contactDetails, setContactDetails] = useState<FooterContactDetails>(defaultFooterContactDetails);

    useEffect(() => {
        const fetchContactDetails = async () => {
            try {
                const response = await fetch("/api/business-details?slug=contact", { cache: "no-store" });
                if (!response.ok) return;

                const result = await response.json();
                if (!result?.data?.body) return;

                setContactDetails(parseFooterContactBody(result.data.body));
            } catch {
            }
        };

        fetchContactDetails();
    }, []);

    const facebookHref = normalizeExternalLink(contactDetails.facebookLink);
    const instagramHref = normalizeExternalLink(contactDetails.instagramLink);
    const socialIconClassName = "transition-colors hover:text-[#E7A3B0]";

    const headerStyle = "uppercase text-[#E7A3B0] font-bold text-xl";
    const headerContentSpace = "space-y-2 text-lg";
    const contentStyle = "text-white "

    return (
        <footer className="w-full bg-[#262626] h-auto md:h-[280px] mt-[100px] flex items-center justify-center py-12 md:py-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-4 px-10 md:px-20 w-full max-w-7xl">
                <div className="flex justify-center md:justify-start">
                    <Image 
                        src={logo} 
                        alt="Dolly's Closet Logo" 
                        width={180}
                        height={180}
                        className="rounded-xl object-cover w-[180px] h-[180px]"
                    />
                </div>

                <div className={headerContentSpace}>
                    <h2 className={headerStyle}>Shop</h2>
                    <Link href="/" className={contentStyle}>Browse Products</Link>
                </div>

                <div className={headerContentSpace}>
                    <h2 className={headerStyle}>Support</h2>
                    <div className="flex flex-col space-y-2">
                        <Link href="/contact" className={contentStyle}>Contact Us</Link>
                        <Link href="/about" className={contentStyle}>FAQ</Link>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className={headerContentSpace}>
                        <h2 className={headerStyle}>Social Media</h2>
                        <div className="flex items-center gap-5">
                            <a
                                href={facebookHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className={`${socialIconClassName} ${facebookHref === "#" ? "pointer-events-none opacity-50" : ""}`}
                            >
                                <Facebook />
                            </a>
                            <a
                                href={instagramHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className={`${socialIconClassName} ${instagramHref === "#" ? "pointer-events-none opacity-50" : ""}`}
                            >
                                <Instagram />
                            </a>
                        </div>
                    </div>

                    <div className={headerContentSpace}>
                        <h2 className={headerStyle}>Address</h2>
                        <p className={contentStyle}>{contactDetails.address}</p>
                    </div>
                </div>
            </div>
        </footer>
    )
}