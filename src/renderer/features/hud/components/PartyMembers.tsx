import clsx from "clsx";
import { formatDamagePercent, formatInt } from "../../shared/utils/format";
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
      <table className="w-full border-collapse overflow-hidden">
        {/* Header */}
        <thead className="text-gray-400 text-center text-[10px]">
          <tr>
            <th className="text-left min-w-30">Player</th>
            <th>DPS</th>
            <th>RDPS</th>
            <th>Swing</th>
            <th>C%</th>
            <th>D%</th>
            <th>CD%</th>
            <th>MaxHit</th>
            <th>Deaths</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody className="text-[11px]">
          {memberData.map((actor) => {
            const jobColor = getJobColor(actor.job);
            const maxRdps = Math.max(...memberData.map((a) => a.rdps), 1);
            const barWidth = (actor.rdps / maxRdps) * 100;

            return (
              <tr
                key={actor.id}
                className={clsx(
                  "w-full h-6 transition-opacity [&>td]:text-center [&>td]:tabular-nums [&>td]:align-middle relative",
                  actor.isDead && "opacity-40",
                  actor.isCurrentPlayer && "[&>td]:font-bold",
                )}
              >
                {/* Player */}
                <td className={clsx("px-1 text-left")}>
                  {/* background bar */}
                  <div
                    className="absolute left-0 top-0 h-full opacity-25"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: jobColor,
                    }}
                  />

                  {/* content */}
                  <div className="flex items-center gap-1 min-w-0 relative z-10">
                    <img
                      src={JOB_ICONS[actor.job]}
                      className="w-4 object-contain"
                      alt={actor.job}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className={clsx("", actor.isDead && "line-through")}>
                      {actor.name}
                    </span>
                  </div>
                </td>

                {/* DPS */}
                <td>
                  <span>{formatInt(actor.dps)}</span>
                </td>

                {/* RDPS */}
                <td>{formatInt(actor.rdps)}</td>

                {/* Swing */}
                <td>{actor.hitCount}</td>

                {/* C% */}
                <td>
                  {formatDamagePercent(actor.critRate)}
                  <span className="text-gray-400">%</span>
                </td>

                {/* D% */}
                <td>
                  {formatDamagePercent(actor.directHitRate)}
                  <span className="text-gray-400">%</span>
                </td>

                {/* CD% */}
                <td>
                  {formatDamagePercent(actor.critDirectHitRate)}
                  <span className="text-gray-400">%</span>
                </td>

                {/* MaxHit */}
                <td className="max-w-25 truncate">
                  <span>{formatInt(actor.maxHitDamage)}</span>
                  <span className="mx-1 text-gray-400">-</span>
                  <span className="text-gray-400 font-medium">
                    {actor.maxHitSkillName}
                  </span>
                </td>

                {/* Deaths */}
                <td>{actor.deathCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
