import { redirect } from "next/navigation";
import { currentMonthInSP } from "@/lib/time/month";
import { resolveLandingMonth } from "@/lib/server/month-view-queries";

export default async function Home() {
  const landing = await resolveLandingMonth();
  redirect(`/m/${landing ?? currentMonthInSP()}`);
}
