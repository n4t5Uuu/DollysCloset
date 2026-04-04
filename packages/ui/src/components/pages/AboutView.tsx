"use client";

import Image from "next/image";
import Link from "next/link";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "../ui/accordion";
import { cn } from "@dollys-closet/core";
import { InView } from "../motion-primitives/in-view";
import { AboutDetailsPayload } from "@dollys-closet/core";
import { images } from "@dollys-closet/core";

interface AboutViewProps {
  aboutDetails: AboutDetailsPayload;
}

function renderParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>);
}

export function AboutView({ aboutDetails }: AboutViewProps) {
  const faqs = Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    const questionKey = `question${number}` as keyof AboutDetailsPayload;
    const answerKey = `answer${number}` as keyof AboutDetailsPayload;

    return {
      id: String(number),
      question: aboutDetails[questionKey],
      answer: aboutDetails[answerKey],
    };
  });

  return (
    <div className="w-full bg-white text-black">
      <section className="relative w-full h-[85vh] flex overflow-hidden">
        {images.map((img, index) => (
          <div 
            key={index} 
            className={cn(
                "relative h-full transition-all duration-700 ease-in-out cursor-pointer group/item",
                "flex-1 hover:flex-[1.5]", 
                index === 1 && "hidden md:block",
                index === 2 && "hidden lg:block",
                index >= 3 && "hidden xl:block"
            )}
          >
            <Image
              src={img.imagePath}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 16vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
              placeholder="blur"
            />
            <div className="absolute inset-0 bg-black/40 transition-colors duration-700 group-hover/item:bg-black/20" />
          </div>
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
          <InView
            variants={{
              hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <h1 className="font-great-vibes! text-5xl md:text-7xl lg:text-8xl xl:text-[10rem] text-[#FF9EAA] drop-shadow-lg leading-tight md:leading-none">
              Elegance Redefined
            </h1>
          </InView>
          <InView
            variants={{
              hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <p className="mt-4 md:mt-6 text-white text-base md:text-lg xl:text-xl font-light tracking-wider max-w-3xl drop-shadow-md px-4">
              Discover timeless pieces, collect your favorites, and elevate your wardrobe with curated style made to stand out.
            </p>
          </InView>
          <InView
            variants={{
              hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Link
              href="/collection"
              className="inline-block mt-6 md:mt-10 px-6 md:px-10 py-3 md:py-4 bg-white/20 backdrop-blur-md border border-white/50 text-white rounded-md uppercase tracking-widest hover:bg-white/40 transition-all duration-300 shadow-lg text-sm md:text-base"
            >
              Explore the Catalog
            </Link>
          </InView>
        </div>
      </section>

      <section className="w-full py-20 px-6 md:px-20 flex flex-col md:flex-row items-center justify-between gap-12 bg-white">
        <div className="w-full md:w-1/2 space-y-6">
          <InView
            variants={{
              hidden: { opacity: 0, x: -100, filter: "blur(4px)" },
              visible: { opacity: 1, x: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight">
              About Dolly&apos;s Closet
            </h2>
          </InView>
          <InView
            variants={{
              hidden: { opacity: 0, x: -100, filter: "blur(4px)" },
              visible: { opacity: 1, x: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-4 text-gray-600 leading-relaxed font-light text-justify">
              {renderParagraphs(aboutDetails.aboutBody)}
            </div>
          </InView>
        </div>
        <div className="w-full md:w-1/3 flex justify-center md:justify-end">
          <InView
            variants={{
              hidden: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
              visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative w-64 h-64 md:w-96 md:h-96">
              <img
                src="https://raw.githubusercontent.com/Alden-Olmedo/DollysCloset-AdminAndEmployee/main/packages/core/src/assets/images/logo/no-bg-logo.png"
                alt="Dolly's Closet Logo"
                width={384}
                height={384}
                className="object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </InView>
        </div>
      </section>

      <section className="w-full py-20 px-6 md:px-20 flex flex-col md:flex-row items-center justify-between gap-12 bg-[#1a1a1a] text-white overflow-x-clip">
        <div className="w-full md:w-1/2 flex justify-center md:justify-start order-2 md:order-1">
          <InView
            variants={{
              hidden: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
              visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full flex justify-center md:justify-start"
          >
            <div className="relative w-full max-w-md aspect-square bg-gray-200 overflow-hidden shadow-2xl">
              <Image
                src={images[3].imagePath}
                alt="History Image"
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                <span className="text-4xl font-oswald text-white/80 uppercase tracking-widest drop-shadow-md">IMAGE</span>
              </div>
            </div>
          </InView>
        </div>
        <div className="w-full md:w-1/2 space-y-6 text-right order-1 md:order-2">
          <InView
            variants={{
              hidden: { opacity: 0, x: 100, filter: "blur(4px)" },
              visible: { opacity: 1, x: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight text-[#FF9EAA]">
              History
            </h2>
          </InView>
          <InView
            variants={{
              hidden: { opacity: 0, x: 100, filter: "blur(4px)" },
              visible: { opacity: 1, x: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-4 text-gray-300 leading-relaxed font-light ml-auto max-w-xl">
              {renderParagraphs(aboutDetails.historyBody)}
            </div>
          </InView>
        </div>
      </section>

      <section className="w-full py-20 px-6 md:px-20 bg-white shadow-inner">
        <div className="w-full mx-auto space-y-6">
          <div className="text-center space-y-4">
            <InView
              variants={{
                hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              viewOptions={{ margin: "0px 0px -200px 0px" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="w-16 h-16 mx-auto relative mb-0">
                <img
                  src="https://raw.githubusercontent.com/Alden-Olmedo/DollysCloset-AdminAndEmployee/main/packages/core/src/assets/images/logo/no-bg-logo.png"
                  alt="Dolly's Closet Logo"
                  width={64}
                  height={64}
                  className="object-contain p-1 rounded-full border-2 border-gray-200 shadow-md"
                />
              </div>
            </InView>
            <InView
              variants={{
                hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              viewOptions={{ margin: "0px 0px -200px 0px" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight text-black">
                Frequently Asked Questions
              </h2>
            </InView>
            <InView
              variants={{
                hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              viewOptions={{ margin: "0px 0px -200px 0px" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <p className="text-gray-500 max-w-lg mx-auto">
                Everything you need to know about our products and services.
              </p>
            </InView>
          </div>

          <InView
            variants={{
              hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            viewOptions={{ margin: "0px 0px -200px 0px" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-gray-50/50 p-6 md:p-10 rounded-2xl border border-gray-100 shadow-sm">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="border border-gray-200 px-4 rounded-lg bg-white transition-all duration-300 cursor-pointer last:border-b"
                  >
                    <AccordionTrigger className="text-left text-lg font-medium hover:text-[#FF9EAA] transition-colors py-4 cursor-pointer">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </InView>
        </div>
      </section>
    </div>
  );
}
