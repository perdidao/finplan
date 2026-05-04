import { redirect } from "next/navigation";
import { currentMonthInSP } from "@/lib/time/month";

export default function Home() {
  redirect(`/m/${currentMonthInSP()}`);
}
