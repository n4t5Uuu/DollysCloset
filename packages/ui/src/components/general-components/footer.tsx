"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchFooterContactBody } from "./footer-data";

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
    address: "04 Admiral, Talon Tres, Las Piñas City",
};



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
        let cancelled = false;

        fetchFooterContactBody().then((parsedBody) => {
            if (cancelled || !parsedBody) return;
            setContactDetails({
                facebookLink: parsedBody.facebookLink || defaultFooterContactDetails.facebookLink,
                instagramLink: parsedBody.instagramLink || defaultFooterContactDetails.instagramLink,
                address: parsedBody.address || defaultFooterContactDetails.address,
            });
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const facebookHref = normalizeExternalLink(contactDetails.facebookLink);
    const instagramHref = normalizeExternalLink(contactDetails.instagramLink);
    const socialIconClassName = "text-white transition-all duration-300 hover:text-[#E7A3B0] hover:-translate-y-1";

    const headerStyle = "uppercase text-[#E7A3B0] font-bold text-lg md:text-xl mb-3 md:mb-4";
    const headerContentSpace = "flex flex-col space-y-2 md:space-y-3 text-base md:text-lg";
    const linkStyle = "text-[#F1F1F1] transition-colors duration-300 hover:text-[#E7A3B0] w-fit";
    const addressStyle = "text-[#F1F1F1] text-sm md:text-base";

    return (
        <footer className="flex h-auto w-full items-center justify-center bg-[#262626] py-12 md:py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-4 px-6 md:px-20 w-full max-w-7xl text-center md:text-left">
                <div className="flex justify-center md:justify-start">
                    <Image
                        src="/images/logo/logo.jpg"
                        alt="Dolly's Closet Logo"
                        width={180}
                        height={180}
                        className="rounded-xl object-cover w-[130px] h-[130px] md:w-[180px] md:h-[180px]"
                    />
                </div>

                <div className={`${headerContentSpace} items-center md:items-start`}>
                    <h2 className={headerStyle}>Shop</h2>
                    <Link href="/collection" className={linkStyle}>Browse Products</Link>
                </div>

                <div className={`${headerContentSpace} items-center md:items-start`}>
                    <h2 className={headerStyle}>Support</h2>
                    <Link href="/contact" className={linkStyle}>Contact Us</Link>
                    <Link href="/about#faq" className={linkStyle}>FAQ</Link>
                </div>

                <div className="space-y-8 flex flex-col items-center md:items-start">
                    <div className={`${headerContentSpace} items-center md:items-start`}>
                        <h2 className={headerStyle}>Social Media</h2>
                        <div className="flex items-center gap-5 mt-1">
                            <a
                                href={facebookHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className={`${socialIconClassName} ${facebookHref === "#" ? "pointer-events-none opacity-50" : ""}`}
                            >
                                <Facebook size={26} />
                            </a>
                            <a
                                href={instagramHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className={`${socialIconClassName} ${instagramHref === "#" ? "pointer-events-none opacity-50" : ""}`}
                            >
                                <Instagram size={26} />
                            </a>
                        </div>
                    </div>

                    <div className={`${headerContentSpace} items-center md:items-start`}>
                        <h2 className={headerStyle}>Address</h2>
                        <a 
                            href="https://www.google.com/maps/search/?api=1&query=02%20Admiral%2C%20Talon%20Tres%2C%20Las%20Pi%C3%B1as%20City"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${addressStyle} hover:text-[#E7A3B0] transition-colors duration-300`}
                        >
                            {contactDetails.address}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
