import { StaticImageData } from "next/image";

export interface OutfitImage {
    id: number;
    imagePath: StaticImageData;
    alt: string;
}
