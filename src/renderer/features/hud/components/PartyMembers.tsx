import clsx from "clsx";
import { formatInt } from "../../shared/utils/format";
import { getJobColor } from "../../shared/utils/getJobColor";
import { ActorUi } from "@/renderer/ws/schemas";
import { JOB_ICONS } from "../../shared/constants/jobIcons";

export default function PartyMembers({
  showParty,
  memberData,
}: {
  showParty: boolean;
  memberData: ActorUi[];
}) {
  return (
    <div
      className={clsx(
        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
        showParty
          ? "grid-rows-[1fr] opacity-100 mt-2 pointer-events-auto"
          : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none",
      )}
    >
      <div className="overflow-hidden space-y-0.5">
        {memberData.map((actor) => {
          const jobColor = getJobColor(actor.job);
          const maxRdps = Math.max(...memberData.map((a) => a.rdps), 1);
          const barWidth = (actor.rdps / maxRdps) * 100;

          return (
            <div
              key={actor.id}
              className={clsx(
                "relative flex items-center justify-between h-6 px-2 rounded overflow-hidden transition-opacity",
                actor.isDead && "opacity-40",
              )}
            >
              <div
                className="absolute left-0 top-0 h-full opacity-15"
                style={{ width: `${barWidth}%`, backgroundColor: jobColor }}
              />
              <div className="flex items-center gap-2 z-10">
                <img
                  src={JOB_ICONS[actor.job]}
                  className="w-4 object-contain"
                  alt={actor.job}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span
                  className={clsx(
                    "text-[11px] font-medium truncate w-24",
                    actor.isDead && "line-through",
                  )}
                  style={{ color: actor.isDead ? "#6B7280" : jobColor }}
                >
                  {actor.name}
                </span>
              </div>
              <div
                className="z-10 text-[11px] font-bold tabular-nums"
                style={{ color: actor.isDead ? "#6B7280" : jobColor }}
              >
                {formatInt(actor.rdps)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
