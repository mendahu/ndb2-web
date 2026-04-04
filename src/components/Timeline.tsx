import {
  TimelineItemType,
} from "@/utils/helpers";
import { TimelineItem } from "./TimelineItem";

interface TimelineProps {
  items: [TimelineItemType, TimelineItemType, TimelineItemType, TimelineItemType];
};

export const Timeline = (props: TimelineProps) => {

  const builtTimeline = props.items.map((item, i) => {
    return (
      <TimelineItem
        status={item.status}
        label={item.label}
        value={item.value}
        key={i}
        addStem={i !== props.items.length - 1}
      />
    );
  });
  return (
    <div className="grid grow basis-1/2 grid-cols-[2rem,auto,130px] grid-rows-4 gap-4">
      {builtTimeline}
    </div>
  );
};
