import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function RootPage() {
  const hasSession = cookies().has("nudmedi_session");
  redirect(hasSession ? "/app-home" : "/login");
}
