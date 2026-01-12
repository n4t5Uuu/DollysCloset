import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function Contact() {
    return (
        <main className="w-full max-w-[1200px] mx-auto px-6 pt-12 flex flex-col md:flex-row gap-12">
            
            {/* LEFT COLUMN: Contact Info */}
            <div className="flex-1 space-y-12">
                
                {/* Contact Us Section */}
                <div className="space-y-6">
                    <h1 className="font-oswald text-3xl font-bold uppercase tracking-wide">
                        Contact Us!
                    </h1>
                    
                    <div className="space-y-3 font-montserrat text-black text-base">
                        <p><span className="font-bold">Facebook:</span> Dolly's Closet</p>
                        <p><span className="font-bold">Instagram:</span> Dolly's Closet</p>
                        <p><span className="font-bold">Viber:</span> Shierly Gonzales</p>
                        <p><span className="font-bold">Contact Number:</span> +63 912 1234 123</p>
                    </div>
                </div>

                {/* Store Visual Section */}
                <div className="space-y-6">
                    <h2 className="font-oswald text-2xl font-bold uppercase tracking-wide">
                        INTERESTED IN VISITING OUR STORE?
                    </h2>
                    
                    <div className="font-montserrat text-black text-base">
                        <p><span className="font-bold">Address:</span> 04 Admiral, Talon Tres, Las Pinas City</p>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Email Form */}
            <div className="flex-1">
                <div className="space-y-6">
                    <h2 className="font-oswald text-2xl font-bold uppercase tracking-wide">
                        SEND US AN EMAIL
                    </h2>

                    {/* Form Container (Gray Box) */}
                    <div className="bg-[#F0F0F0] rounded-xl p-8 shadow-sm">
                        <form className="space-y-4">
                            <Input 
                                type="email" 
                                placeholder="Your Email" 
                                className="bg-white border-[#E7A3B0] rounded-lg h-12 px-4 placeholder:text-gray-400 font-montserrat focus-visible:ring-[#E7A3B0]"
                            />
                            
                            <Input 
                                type="text" 
                                placeholder="Subject" 
                                className="bg-white border-[#E7A3B0] rounded-lg h-12 px-4 placeholder:text-gray-400 font-montserrat focus-visible:ring-[#E7A3B0]"
                            />
                            
                            <Textarea 
                                placeholder="Body" 
                                className="bg-white border-[#E7A3B0] rounded-lg min-h-[200px] p-4 placeholder:text-gray-400 font-montserrat resize-none focus-visible:ring-[#E7A3B0]"
                            />

                            <Button 
                                type="submit" 
                                className="w-full h-12 bg-[#E7A3B0] hover:bg-[#d68c9a] text-white font-bold font-oswald uppercase tracking-wider text-lg rounded-lg transition-colors"
                            >
                                Submit
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

        </main>
    )
}