import { redirect } from "next/navigation";

export default function Home() {
  // Will redirect to /m/<current-month> after time helper exists (Task 3).
  redirect("/login");
}
