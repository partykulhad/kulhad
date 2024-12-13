import {GlassWater, MapPinIcon} from "lucide-react";
import Link from "next/link";

export default function Logo() {
  return (
    <div className="hidden md:flex gap-10 items-center justify-start flex-1">
      <Link href={"/"}>
        <div className="flex gap-1 justify-center items-center">
          <GlassWater className="h-6 w-6 text-amber-900" />
          <div className="flex flex-col leading-5 font-bold text-2xl text-amber-800">Kulhad</div>
        </div>
      </Link>
    </div>
  );
}
