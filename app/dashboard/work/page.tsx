import { WorkForm } from "@/components/work/WorkForm";
import { WorkList } from "@/components/work/WorkList";

export default function WorkPage() {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-4 items-start">
      <div className="order-1"><WorkList /></div>
      <div className="order-2 w-full"><WorkForm /></div>
    </div>
  );
}
