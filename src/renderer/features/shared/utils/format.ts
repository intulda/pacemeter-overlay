const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const formatInt = (n: number) => Math.round(n).toLocaleString();
const formatDelta = (n: number) => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded >= 0 ? `+${abs}` : `-${abs}`;
};

const formatPercentLabel = (p: number) => `${Math.round(p)}%`;

const formatDamagePercent = (p: number) => `${Math.round(p * 1000) / 10}`;

const formatTimeShort = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remain = totalSeconds % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
};
const formatSignedTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "--";
  const sign = seconds >= 0 ? "+" : "-";
  return `${sign}${formatTimeShort(Math.abs(seconds))}`;
};
const formatJobId = (jobId: number) => `0x${jobId.toString(16).toUpperCase()}`;

export {
  clamp,
  formatInt,
  formatDelta,
  formatPercentLabel,
  formatDamagePercent,
  formatTimeShort,
  formatSignedTime,
  formatJobId,
};
