import Image from "next/image";
import kulhad from "@/public/kulhad.svg";

export default function Home() {
  return (
    <div className="scroll-m-5 w-full">
      <section
        className="lg:px-20 px-5 py-2 
                bg-background
                w-full h-full
                flex md:flex-row flex-col lg:justify-between justify-center items-center
                gap-5
                min-h-[calc(100svh-4rem)]"
      >
        <article className="flex flex-col h-full lg:flex-1 gap-10">
          <h1 className="text-8xl font-bold text-yellow-500">
            Savor Tradition <br />
            <span className="text-gray-600">Sip in Style</span>
          </h1>
          <p className="max-w-lg text-lg tracking-wider leading-6 font-medium text-slate-600">
            Experience the rich aroma of chai in eco-friendly clay kulhads,
            handcrafted for a soulful tea journey.
          </p>

          {/* QR Code Display */}
          {/* <div className="mt-5 flex flex-col items-center">
            <p className="text-lg font-medium text-gray-700">Scan to Pay</p>
            <img
              src="https://rzp.io/rzp/Sw2bf6H3"
              alt="QR Code"
              className="w-40 h-40 mt-2"
            />
          </div> */}
        </article>

        <figure className="h-full lg:flex-1 flex-1 flex justify-center items-center ">
          <div className="h-80 w-80 rounded-full bg-yellow-500 relative">
            <Image
              src={kulhad}
              width={600}
              height={600}
              alt="kulhad"
              className="absolute -top-28"
            />
            <span className="absolute bottom-1/3 font-bold text-5xl text-center w-full text-yellow-900">
              Kulhad Tea
            </span>
          </div>
        </figure>
      </section>
    </div>
  );
}
