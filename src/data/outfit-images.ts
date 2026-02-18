import { StaticImageData } from "next/image";
import laurenWolfe from "@/assets/images/outfits/4-laurenwolfe.jpg";
import sweaterBrownLeatherShorts from "@/assets/images/outfits/Outfit-Sweater-Brown-Leather-Shorts.jpg";
import sweatshirtBaggyJeans from "@/assets/images/outfits/Sweatshirt-With-Baggy-Jeans.jpg";
import allBlackFit from "@/assets/images/outfits/all-black-fit.jpg";
import shortsFit from "@/assets/images/outfits/shorts-fit.jpg";
import baggyPantsTrench from "@/assets/images/outfits/women-with-baggy-pants-and-trench-coat.jpg";

export interface ImageProps {
    imagePath: StaticImageData;
    alt: string;
}

export const images: ImageProps[] = [
    {
        imagePath: laurenWolfe,
        alt: "Lauren Wolfe Outfit",
    },
    {
        imagePath: sweaterBrownLeatherShorts,
        alt: "Sweater with Brown Leather Shorts",
    },
    {
        imagePath: sweatshirtBaggyJeans,
        alt: "Sweatshirt with Baggy Jeans",
    },  
    {
        imagePath: allBlackFit,
        alt: "All Black Fit",
    },
    {
        imagePath: shortsFit,
        alt: "Shorts Fit",
    },
    {
        imagePath: baggyPantsTrench,
        alt: "Baggy Pants with Trench Coat",
    },
];