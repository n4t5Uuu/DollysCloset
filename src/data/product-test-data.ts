export interface Product {
    id: string;
    name: string;
    category: string;
    type: string;
    price: number;
    brand: string;
    size: string;
    condition: string;
    description: string;
    stock: number;
    isNewArrival: boolean;
    images: string[];
}

export const products: Product[] = [
    {
        id: "1",
        name: "Vintage 90s Graphic Tee",
        category: "Men's Top",
        type: "Teenagers",
        price: 1250.00,
        brand: "Nike",
        size: "Large",
        condition: "Excellent - 9/10",
        description: "Authentic vintage 90s Nike graphic tee in excellent condition. Minimal fading on the print, no holes or stains. Soft cotton fabric with a boxy fit typical of the era. Perfect for streetwear outfits.",
        stock: 18,
        isNewArrival: true,
        images: [
            "/assets/products/tee-main.jpg",
            "/assets/products/tee-back.jpg",
            "/assets/products/tee-label.jpg", 
            "/assets/products/tee-detail.jpg",
            "/assets/products/tee-side.jpg"
        ]
    },
    {
        id: "2",
        name: "Denim Jacket",
        category: "Seasonal",
        type: "Jackets",
        price: 2500.00,
        brand: "Levi's",
        size: "Medium",
        condition: "Good - 8/10",
        description: "Classic Levi's denim jacket with a nice natural fade. Some minor distressing on the cuffs adds character. All buttons are original and functional. A timeless staple for any wardrobe.",
        stock: 22,
        isNewArrival: false,
        images: [
            "/assets/products/jacket-main.jpg",
            "/assets/products/jacket-back.jpg",
            "/assets/products/jacket-buttons.jpg",
            "/assets/products/jacket-label.jpg",
            "/assets/products/jacket-wear.jpg"
        ]
    },
    {
        id: "3",
        name: "Summer Floral Dress",
        category: "Women's Top",
        type: "Tees",
        price: 850.00,
        brand: "H&M",
        size: "Small",
        condition: "Like New - 10/10",
        description: "Lightweight and flowy floral dress perfect for summer. Worn only once for a photoshoot. Features adjustable straps and a side zipper. No visible signs of wear.",
        stock: 8,
        isNewArrival: true,
        images: [
            "/assets/products/dress-main.jpg",
            "/assets/products/dress-back.jpg",
            "/assets/products/dress-pattern.jpg",
            "/assets/products/dress-hem.jpg",
            "/assets/products/dress-fit.jpg"
        ]
    },
    {
        id: "4",
        name: "Leather Crossbody Bag",
        category: "Accessories",
        type: "Bags",
        price: 3200.00,
        brand: "Coach",
        size: "One Size",
        condition: "Good - 8/10",
        description: "Genuine leather crossbody bag in a rich dark brown. Gold hardware shows slight tarnish but the leather is well-conditioned. Perfect size for daily essentials.",
        stock: 35,
        isNewArrival: false,
        images: [
            "/assets/products/bag-main.jpg",
            "/assets/products/bag-inside.jpg",
            "/assets/products/bag-strap.jpg",
            "/assets/products/bag-bottom.jpg",
            "/assets/products/bag-logo.jpg"
        ]
    },
    {
        id: "5",
        name: "High-Waisted Corduroy Pants",
        category: "Coords",
        type: "Training",
        price: 1100.00,
        brand: "Uniqlo",
        size: "26",
        condition: "Excellent - 9.5/10",
        description: "Deep burgundy corduroy pants with a flattering high-waisted wide-leg cut. Soft texture and perfect for colder seasons. No visible flaws.",
        stock: 42,
        isNewArrival: false,
        images: [
            "/assets/products/pants-main.jpg",
            "/assets/products/pants-back.jpg",
            "/assets/products/pants-texture.jpg",
            "/assets/products/pants-waist.jpg",
            "/assets/products/pants-hem.jpg"
        ]
    },
    {
        id: "6",
        name: "Vintage Windbreaker",
        category: "Seasonal",
        type: "Raincoats",
        price: 1800.00,
        brand: "Adidas",
        size: "XL",
        condition: "Good - 7/10",
        description: "Retro 80s colorblock windbreaker. Features a stowaway hood and zippered pockets. Elastic cuffs have lost some stretch but still wearable. A rare find.",
        stock: 12,
        isNewArrival: true,
        images: [
            "/assets/products/windbreaker-main.jpg",
            "/assets/products/windbreaker-back.jpg",
            "/assets/products/windbreaker-logo.jpg",
            "/assets/products/windbreaker-open.jpg",
            "/assets/products/windbreaker-tag.jpg"
        ]
    },
    {
        id: "7",
        name: "Platform Boots",
        category: "Footwear",
        type: "Boots",
        price: 4500.00,
        brand: "Dr. Martens",
        size: "US 8",
        condition: "Like New - 9.5/10",
        description: "Jadon platform boots in polished smooth leather. Barely worn, soles show almost no wear. Comes with original box and yellow laces.",
        stock: 5,
        isNewArrival: true,
        images: [
            "/assets/products/boots-main.jpg",
            "/assets/products/boots-side.jpg",
            "/assets/products/boots-soles.jpg",
            "/assets/products/boots-toes.jpg",
            "/assets/products/boots-box.jpg"
        ]
    },
    {
        id: "8",
        name: "Oversized Knit Sweater",
        category: "Women's Top",
        type: "Blouses",
        price: 950.00,
        brand: "Zara",
        size: "Medium",
        condition: "Good - 8.5/10",
        description: "Chunky knit sweater in a neutral oatmeal color. Very warm and cozy. Slight pilling near the underarms but easily removable. Great for layering.",
        stock: 27,
        isNewArrival: false,
        images: [
            "/assets/products/sweater-main.jpg",
            "/assets/products/sweater-texture.jpg",
            "/assets/products/sweater-back.jpg",
            "/assets/products/sweater-neck.jpg",
            "/assets/products/sweater-sleeve.jpg"
        ]
    },
    {
        id: "9",
        name: "Silk Patterned Scarf",
        category: "Accessories",
        type: "Scarves",
        price: 450.00,
        brand: "Hermès (Vintage)",
        size: "One Size",
        condition: "Good - 8/10",
        description: "Elegant vintage silk scarf with a vibrant equestrian print. Hand-rolled edges. Small water stain near one corner, barely visible when worn.",
        stock: 15,
        isNewArrival: false,
        images: ["/assets/products/scarf-main.jpg"]
    },
    {
        id: "10",
        name: "Camo Cargo Shorts",
        category: "Men's Top",
        type: "Long Sleeves",
        price: 700.00,
        brand: "Carhartt",
        size: "32",
        condition: "Excellent - 9/10",
        description: "Durable cotton canvas cargo shorts in woodland camo. Multiple pockets for utility. Rugged construction, perfect for outdoor activities.",
        stock: 19,
        isNewArrival: false,
        images: ["/assets/products/shorts-main.jpg"]
    },
    {
        id: "11",
        name: "Quilted Puffer Vest",
        category: "Coords",
        type: "Hoodies",
        price: 1500.00,
        brand: "The North Face",
        size: "Large",
        condition: "Like New - 10/10",
        description: "Black 700-fill down puffer vest. Extremely warm and lightweight. Zippers verify authenticity. No signs of wear.",
        stock: 31,
        isNewArrival: true,
        images: ["/assets/products/vest-main.jpg"]
    },
    {
        id: "12",
        name: "Checkerboard Slip-Ons",
        category: "Footwear",
        type: "Shoes",
        price: 800.00,
        brand: "Vans",
        size: "US 9",
        condition: "Fair - 6/10",
        description: "Classic checkerboard slip-ons. Well-loved with some separation at the toe crease and heel drag. Still plenty of life left for a skater look.",
        stock: 7,
        isNewArrival: false,
        images: ["/assets/products/vans-main.jpg"]
    },
    {
        id: "13",
        name: "College Hoodie",
        category: "Men's Top",
        type: "Polo",
        price: 600.00,
        brand: "Champion",
        size: "Medium",
        condition: "Good - 8/10",
        description: "Grey reverse weave hoodie with university print. Thick, heavy cotton blend. One small cuff fray.",
        stock: 28,
        isNewArrival: true,
        images: ["/assets/products/hoodie-main.jpg"]
    },
    {
        id: "14",
        name: "Black Pencil Skirt",
        category: "Women's Top",
        type: "Tees",
        price: 550.00,
        brand: "Banana Republic",
        size: "4",
        condition: "Excellent - 9/10",
        description: "Professional black pencil skirt suitable for office wear. Stretchy material for comfort. Back slit for ease of movement.",
        stock: 9,
        isNewArrival: false,
        images: ["/assets/products/skirt-main.jpg"]
    },
    {
        id: "15",
        name: "Wool Beanie",
        category: "Accessories",
        type: "Hats",
        price: 350.00,
        brand: "Stüssy",
        size: "One Size",
        condition: "Like New - 9.5/10",
        description: "Thick knit ribbed beanie in forest green. Embroidered logo on the cuff. Very warm.",
        stock: 11,
        isNewArrival: false,
        images: ["/assets/products/beanie-main.jpg"]
    },
    {
        id: "16",
        name: "Plaid Flannel Shirt",
        category: "Men's Top",
        type: "Long Sleeves",
        price: 850.00,
        brand: "L.L.Bean",
        size: "Large",
        condition: "Excellent - 9/10",
        description: "Heavyweight traditional flannel in red and black buffalo check. All buttons intact. Soft, brushed feel.",
        stock: 33,
        isNewArrival: true,
        images: ["/assets/products/flannel-main.jpg"]
    },
    {
        id: "17",
        name: "Galaxy Print Leggings",
        category: "Coords",
        type: "Training",
        price: 400.00,
        brand: "BlackMilk",
        size: "Small",
        condition: "Good - 7.5/10",
        description: "Iconic shiny galaxy print leggings. Elastic is still snappy. Minor fading on the knees.",
        stock: 16,
        isNewArrival: false,
        images: ["/assets/products/leggings-main.jpg"]
    },
    {
        id: "18",
        name: "Beige Trench Coat",
        category: "Seasonal",
        type: "Jackets",
        price: 2800.00,
        brand: "Burberry (Vintage)",
        size: "Medium (40R)",
        condition: "Fair - 6.5/10",
        description: "Classic double-breasted trench coat. Missing the belt. Some small spots on the lower hem that may come out with dry cleaning.",
        stock: 3,
        isNewArrival: false,
        images: ["/assets/products/trench-main.jpg"]
    },
    {
        id: "19",
        name: "Aviator Sunglasses",
        category: "Accessories",
        type: "Eyewear",
        price: 1200.00,
        brand: "Ray-Ban",
        size: "Standard",
        condition: "Good - 8/10",
        description: "Gold frame aviators with green lenses. Small scratch on the left lens not affecting vision. Comes with case.",
        stock: 20,
        isNewArrival: false,
        images: ["/assets/products/glasses-main.jpg"]
    },
    {
        id: "20",
        name: "High Top Sneakers",
        category: "Footwear",
        type: "Shoes",
        price: 900.00,
        brand: "Converse",
        size: "US 7",
        condition: "Excellent - 9/10",
        description: "Chuck Taylor All Star 70s in parchment. Glossy off-white midsole. Worn twice indoors.",
        stock: 24,
        isNewArrival: true,
        images: ["/assets/products/converse-main.jpg"]
    }
];

