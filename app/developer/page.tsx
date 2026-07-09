import { DevServerManagerCard } from "@/components/developer/DevServerManagerCard";

export default function DeveloperPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Development OS</h1>
      <p className="text-gray-400 mb-6">
        위 메뉴에서 관리할 도구를 선택하세요.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DevServerManagerCard />
      </div>
    </div>
  );
}
