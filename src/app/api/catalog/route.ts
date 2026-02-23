import {createServerSupabase} from "@/lib/supabase/server"
import {NextRequest, NextResponse} from "next/server"

export async function GET(request: NextRequest) {
    try{
        const supabase = await createServerSupabase();

        const {data, error} = await supabase.from("tbl_product")
            .select("*, tbl_category (category_name), tbl_product_image:tbl_product_image!tbl_product_image_product_id_fkey (image_url, is_primary)")
            .eq("show_in_catalog", true);

        if(error){
            throw error;
        }

        console.log("Fetched product sample:", data?.slice(0, 2));

        return NextResponse.json({data: data || []});
    }catch(error: any){
        console.error("Error fetching catalog:", error);
        return NextResponse.json({error: "Internal server error", details: error.message || error}, {status: 500});
    }
}