import Link from "next/link";
import Image from "next/image";
import kulhad from "@/public/URBAN KETL.svg";

export default function Logo({ textColor = "text-amber-800", size = 120 }) {
  return (
    <div className="hidden md:flex gap-10 items-center justify-start flex-1">
      <Link href={"/"} aria-label="Go to homepage">
        <div
          className="flex gap-1 justify-center items-center relative overflow-hidden"
          style={{ width: "150px", height: "80px" }} // Fixed container size
        >
          {/* SVG Logo */}
          <div
            className={`flex leading-5 font-bold items-end text-2xl ${textColor}`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 500 500"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {/* Optimized SVG paths */}
              <g
                transform="translate(0,600) scale(0.1,-0.1)"
                fill="#000"
                stroke="none"
              >
                <path d="M2240 3903 c-247 -24 ..." />
              </g>
            </svg>
          </div>
          {/* Image Logo */}
          <Image
            src={kulhad}
            alt="Kulhad logo"
            width={size}
            height={size}
            className="absolute top-0 left-0 w-auto h-auto"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </Link>
    </div>
  );
}
