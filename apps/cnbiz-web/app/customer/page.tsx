import { redirect } from "next/navigation";

/** `/customer` 진입점 — 실제 콘텐츠는 `/customer/dashboard`. */
export default function CustomerRootPage() {
  redirect("/customer/dashboard");
}
